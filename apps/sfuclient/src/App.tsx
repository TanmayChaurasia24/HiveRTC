import { useState, useRef, useEffect } from "react";
import { useSFU } from "./hooks/useSFU";
import { SpatialCanvas } from "./components/SpatialCanvas";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Loader2,
  AlertCircle,
  Headphones,
} from "lucide-react";

// ── Spatial Audio Engine (Web Audio API) ──
class SpatialAudio {
  private ctx: AudioContext | null = null;
  private nodes = new Map<
    string,
    {
      source: MediaElementAudioSourceNode;
      panner: PannerNode;
      gain: GainNode;
    }
  >();
  private attachedElements = new Set<HTMLAudioElement>();
  private PX = 50;

  async init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    const L = this.ctx.listener;
    if (L.positionX) {
      L.positionX.value = 0;
      L.positionY.value = 0;
      L.positionZ.value = 0;
    }
    console.log("[SpatialAudio] AudioContext ready, state:", this.ctx.state);
  }

  /**
   * Capture an <audio> element via createMediaElementSource.
   * This takes over the element's output — audio flows:
   * <audio> → source → panner (HRTF) → gain → speakers
   */
  attachElement(userId: string, element: HTMLAudioElement) {
    if (!this.ctx) return;
    if (this.attachedElements.has(element)) return; // already captured
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.detach(userId);

    try {
      const source = this.ctx.createMediaElementSource(element);
      const panner = this.ctx.createPanner();
      const gain = this.ctx.createGain();

      panner.panningModel = "HRTF";
      // Inverse: volume decreases but NEVER reaches 0
      // gain = ref / (ref + roll * (dist - ref))
      panner.distanceModel = "inverse";
      panner.refDistance = 1;        // ~50px = full volume
      panner.maxDistance = 20;       // caps at ~1000px
      panner.rolloffFactor = 0.3;   // gentle — always audible
      panner.coneInnerAngle = 360;
      panner.coneOuterAngle = 0;
      panner.coneOuterGain = 0;

      source.connect(panner);
      panner.connect(gain);
      gain.connect(this.ctx.destination);

      this.nodes.set(userId, { source, panner, gain });
      this.attachedElements.add(element);
      console.log("[SpatialAudio] Attached:", userId, "| Nodes:", this.nodes.size);
    } catch (e) {
      console.error("[SpatialAudio] attachElement failed:", e);
    }
  }

  detach(userId: string) {
    const n = this.nodes.get(userId);
    if (n) {
      n.source.disconnect();
      n.panner.disconnect();
      n.gain.disconnect();
      this.nodes.delete(userId);
    }
  }

  updateListener(pos: { x: number; y: number }) {
    if (!this.ctx) return;
    const L = this.ctx.listener;
    if (L.positionX) {
      L.positionX.value = pos.x / this.PX;
      L.positionY.value = pos.y / this.PX;
    }
  }

  updatePeer(userId: string, pos: { x: number; y: number }) {
    const n = this.nodes.get(userId);
    if (n) {
      n.panner.positionX.value = pos.x / this.PX;
      n.panner.positionY.value = pos.y / this.PX;
      n.panner.positionZ.value = 0;
    }
  }

  destroy() {
    this.nodes.forEach((n) => {
      n.source.disconnect();
      n.panner.disconnect();
      n.gain.disconnect();
    });
    this.nodes.clear();
    this.attachedElements.clear();
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}

// ── Colors for peers ──
const COLORS = [
  "#22d3ee", "#a78bfa", "#f472b6", "#34d399",
  "#fbbf24", "#f87171", "#60a5fa", "#c084fc",
];

// ── Video player ──
function VideoPlayer({
  stream,
  isLocal = false,
}: {
  stream: MediaStream;
  isLocal?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={isLocal}
      className={`w-full h-full object-cover rounded-2xl shadow-xl ring-1 ring-slate-800 ${isLocal ? "scale-x-[-1]" : ""}`}
    />
  );
}

// ════════════════════════════════════════════════
// Main App — Spatial Audio Demo
// ════════════════════════════════════════════════

export default function App() {
  const [roomIdInput, setRoomIdInput] = useState("");
  const {
    joinRoom,
    leaveRoom,
    toggleCam,
    toggleMic,
    isMicOn,
    isCamOn,
    joined,
    connectionState,
    localStream,
    remoteMedia,
    socketRef,
  } = useSFU();

  // ── Spatial Audio State ──
  const spatialRef = useRef(new SpatialAudio());
  const [localPos, setLocalPos] = useState({ x: 350, y: 250 });
  const [peerPositions, setPeerPositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());
  const peerColorMap = useRef(new Map<string, string>());
  const audioRadius = 250;

  // ── On Join: listen for position updates ──
  useEffect(() => {
    if (!joined || !socketRef.current) return;
    const socket = socketRef.current;

    spatialRef.current.updateListener(localPos);

    // Send our initial position
    socket.emit("position-update", {
      userId: socket.id,
      x: localPos.x,
      y: localPos.y,
    });

    // Listen for other peers' position updates
    const handler = (data: { userId: string; x: number; y: number }) => {
      setPeerPositions((prev) => {
        const next = new Map(prev);
        next.set(data.userId, { x: data.x, y: data.y });
        return next;
      });
      spatialRef.current.updatePeer(data.userId, {
        x: data.x,
        y: data.y,
      });
    };

    socket.on("position-update", handler);

    return () => {
      socket.off("position-update", handler);
      spatialRef.current.destroy();
    };
  }, [joined]);

  // ── Update listener position + broadcast ──
  const handlePositionChange = (pos: { x: number; y: number }) => {
    setLocalPos(pos);
    spatialRef.current.updateListener(pos);
    socketRef.current?.emit("position-update", {
      userId: socketRef.current.id,
      x: pos.x,
      y: pos.y,
    });
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomIdInput.trim()) return;
    // Init AudioContext in the user gesture (click) context
    // so the browser doesn't block it
    await spatialRef.current.init();
    spatialRef.current.updateListener(localPos);
    joinRoom(roomIdInput.trim());
  };

  // ── Build peer list for canvas ──
  const canvasPeers = Array.from(peerPositions.entries()).map(
    ([userId, pos], i) => {
      if (!peerColorMap.current.has(userId)) {
        peerColorMap.current.set(
          userId,
          COLORS[peerColorMap.current.size % COLORS.length]!,
        );
      }
      return {
        userId,
        x: pos.x,
        y: pos.y,
        color: peerColorMap.current.get(userId)!,
      };
    },
  );

  const videoStreams = remoteMedia.filter((m) => m.kind === "video");

  return (
    <div className="min-h-[100dvh] bg-[#06080e] text-slate-100 overflow-hidden flex flex-col items-center relative font-sans w-full">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute top-[5%] left-[10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute bottom-[10%] right-[5%] w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px] mix-blend-screen animate-pulse"
          style={{ animationDuration: "12s" }}
        />
      </div>

      {!joined ? (
        // ═══ LOBBY ═══
        <div className="relative z-10 w-full max-w-lg mt-24 px-4 flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
          <div className="bg-white/[0.04] backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl p-10 w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="mb-10 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.4)] ring-1 ring-white/20">
                <Headphones className="w-10 h-10 text-white drop-shadow-md" />
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent pb-1">
                3D Spatial Audio
              </h2>
              <p className="text-slate-400 mt-2 text-sm font-medium tracking-wide">
                HRTF-based positional audio • Drag avatars to hear the
                difference
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-6 w-full">
              <input
                type="text"
                placeholder="Enter Room Code..."
                className="w-full bg-[#0a0f1c]/80 backdrop-blur-md border border-white/10 text-white rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500 text-lg font-medium"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                disabled={connectionState === "connecting"}
              />
              {connectionState === "error" && (
                <div className="bg-red-500/10 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                  <p>Connection failed. Ensure the SFU server is running.</p>
                </div>
              )}
              <button
                disabled={
                  connectionState === "connecting" || !roomIdInput.trim()
                }
                className="w-full bg-white text-slate-900 disabled:bg-white/10 disabled:text-slate-500 font-bold py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-lg disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
              >
                {connectionState === "connecting" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Join Spatial Room{" "}
                    <Headphones className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Instructions for evaluators */}
          <div className="mt-8 bg-white/[0.03] border border-white/10 rounded-2xl p-6 w-full">
            <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              📋 How to Demo for Evaluators
            </h3>
            <ol className="text-slate-400 text-xs space-y-2 list-decimal pl-4">
              <li>Start the SFU server: <code className="bg-white/5 px-2 py-0.5 rounded text-indigo-300">cd apps/sfu_comm && pnpm dev</code></li>
              <li>Open this page in <strong className="text-white">two browser tabs</strong></li>
              <li>Join the <strong className="text-white">same room code</strong> in both tabs</li>
              <li>Allow microphone + camera access in both</li>
              <li><strong className="text-white">Drag your avatar</strong> closer/farther on the 2D map</li>
              <li>Listen as audio <strong className="text-white">pans left/right</strong> and changes volume based on distance</li>
            </ol>
          </div>
        </div>
      ) : (
        // ═══ MEETING + SPATIAL AUDIO DEMO ═══
        <div className="relative z-10 w-full h-[100dvh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-b from-[#06080e] via-[#06080e]/80 to-transparent z-50">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                <Headphones className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="font-bold text-white tracking-wide text-xl">
                  {roomIdInput}
                </h1>
                <div className="flex items-center gap-2 text-xs font-semibold mt-1">
                  <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded border border-white/5 text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    3D Spatial Audio Active
                  </div>
                  <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 text-slate-300">
                    {videoStreams.length + 1} User
                    {videoStreams.length + 1 !== 1 && "s"}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-xs font-bold text-slate-300 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10 tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,1)]" />
              HRTF ENGINE
            </div>
          </div>

          {/* Main content: Canvas + Video Grid */}
          <div className="flex-1 flex gap-4 px-6 pb-28 overflow-hidden">
            {/* Left: Spatial Canvas */}
            <div className="flex flex-col gap-3 flex-shrink-0">
              <SpatialCanvas
                localPosition={localPos}
                peers={canvasPeers}
                onPositionChange={handlePositionChange}
                audioRadius={audioRadius}
                canvasWidth={600}
                canvasHeight={420}
              />
              {/* Spatial Audio Info Panel */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex gap-6 text-xs">
                <div>
                  <span className="text-slate-500 uppercase tracking-widest text-[10px]">Your Position</span>
                  <div className="text-white font-mono font-bold mt-0.5">
                    ({Math.round(localPos.x)}, {Math.round(localPos.y)})
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-widest text-[10px]">Audio Radius</span>
                  <div className="text-indigo-400 font-mono font-bold mt-0.5">
                    {audioRadius}px
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-widest text-[10px]">Peers in Range</span>
                  <div className="text-emerald-400 font-mono font-bold mt-0.5">
                    {canvasPeers.filter(
                      (p) =>
                        Math.sqrt(
                          (p.x - localPos.x) ** 2 +
                            (p.y - localPos.y) ** 2,
                        ) <= audioRadius,
                    ).length}{" "}
                    / {canvasPeers.length}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-widest text-[10px]">Engine</span>
                  <div className="text-cyan-400 font-mono font-bold mt-0.5">
                    Web Audio HRTF
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Video Grid */}
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar min-w-[300px]">
              {/* Local Video */}
              {localStream && (
                <div className="relative w-full aspect-video bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 hover:ring-indigo-500/50 transition-all">
                  <VideoPlayer stream={localStream} isLocal />
                  {!isCamOn && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0f1c]/90 backdrop-blur-xl">
                      <VideoOff className="w-10 h-10 text-slate-500" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 bg-[#0a0f1c]/70 backdrop-blur-xl px-3 py-1.5 rounded-xl text-xs font-semibold text-white border border-white/10">
                    You{" "}
                    {!isMicOn && (
                      <span className="text-red-400 text-[10px] ml-1">
                        (Muted)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Remote Videos */}
              {videoStreams.map((media) => (
                <div
                  key={media.producerId}
                  className="relative w-full aspect-video bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95"
                >
                  <VideoPlayer stream={media.stream} />
                  <div className="absolute bottom-3 left-3 bg-[#0a0f1c]/70 backdrop-blur-xl px-3 py-1.5 rounded-xl text-xs font-semibold text-white border border-white/10 flex items-center gap-2">
                    Participant
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  </div>
                </div>
              ))}

              {videoStreams.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                  <div className="text-center">
                    <Headphones className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Waiting for participants...</p>
                    <p className="text-xs mt-1 opacity-60">
                      Open another tab and join the same room
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/*
            <audio> elements with createMediaElementSource:
            The spatial engine captures the element's output and routes
            it through HRTF PannerNode. Single audio path — no cutting.
          */}
          {remoteMedia
            .filter((m) => m.kind === "audio")
            .map((m) => {
              const key = m.userId || m.producerId;
              return (
                <audio
                  key={m.producerId}
                  ref={(el) => {
                    if (el && el.srcObject !== m.stream) {
                      el.srcObject = m.stream;
                      el.play().catch(() => {});
                      // Capture this element's output into the spatial engine
                      spatialRef.current.attachElement(key, el);
                      console.log("[Audio] Spatial audio attached for:", key);
                    }
                  }}
                  autoPlay
                  playsInline
                />
              );
            })}

          {/* Bottom Controls */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
            <div className="pointer-events-auto bg-white/10 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-3">
              <button
                onClick={toggleMic}
                className={`p-4 rounded-2xl transition-all group ${
                  isMicOn
                    ? "bg-white/15 hover:bg-white/25 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                }`}
              >
                {isMicOn ? (
                  <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
                ) : (
                  <MicOff className="w-6 h-6 group-hover:scale-110 transition-transform" />
                )}
              </button>
              <button
                onClick={toggleCam}
                className={`p-4 rounded-2xl transition-all group ${
                  isCamOn
                    ? "bg-white/15 hover:bg-white/25 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                }`}
              >
                {isCamOn ? (
                  <Video className="w-6 h-6 group-hover:scale-110 transition-transform" />
                ) : (
                  <VideoOff className="w-6 h-6 group-hover:scale-110 transition-transform" />
                )}
              </button>
              <div className="w-px h-10 bg-white/20 mx-1" />
              <button
                onClick={leaveRoom}
                className="px-6 py-4 rounded-2xl bg-white hover:bg-slate-200 text-red-600 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all font-extrabold flex items-center gap-2 group relative overflow-hidden"
              >
                <PhoneOff className="w-6 h-6 relative z-10 group-hover:-rotate-12 transition-transform" />
                <span className="relative z-10">Leave</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
