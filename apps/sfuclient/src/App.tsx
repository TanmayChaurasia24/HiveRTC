import { useState, useRef, useEffect } from "react";
import { useSFU } from "./hooks/useSFU";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Helper components for UI
function VideoPlayer({
  stream,
  isLocal = false,
}: {
  stream: MediaStream;
  isLocal?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className={`w-full h-full object-cover rounded-2xl shadow-xl ring-1 ring-slate-800 ${isLocal ? "scale-x-[-1]" : ""
        }`}
    />
  );
}

function AudioPlayer({ stream }: { stream: MediaStream }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      // We must explicitly ensure volume/play status
      audioRef.current
        .play()
        .catch((e) => console.log("Audio play blocked", e));
    }
  }, [stream]);
  return <audio ref={audioRef} autoPlay />;
}

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
  } = useSFU();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomIdInput.trim()) {
      joinRoom(roomIdInput.trim());
    }
  };

  const videoStreams = remoteMedia.filter((m) => m.kind === "video");
  const audioStreams = remoteMedia.filter((m) => m.kind === "audio");

  // Dynamic grid configuration based on total videos and responsive breakpoints
  const totalVideos = videoStreams.length + 1; // 1 for local
  let gridClass = "grid-cols-1";
  if (totalVideos === 1) gridClass = "grid-cols-1";
  else if (totalVideos === 2) gridClass = "grid-cols-1 sm:grid-cols-2";
  else if (totalVideos <= 4) gridClass = "grid-cols-1 sm:grid-cols-2";
  else if (totalVideos <= 6) gridClass = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
  else gridClass = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

  return (
    <div className="min-h-[100dvh] bg-[#06080e] text-slate-100 selection:bg-indigo-500/30 overflow-hidden flex flex-col items-center relative font-sans w-full">
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
        <div
          className="absolute top-[5%] left-[10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-indigo-600/30 rounded-full blur-[80px] md:blur-[120px] mix-blend-screen animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute bottom-[10%] right-[5%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-blue-600/20 rounded-full blur-[100px] md:blur-[140px] mix-blend-screen animate-pulse"
          style={{ animationDuration: '12s', animationDelay: '2s' }}
        />
        <div className="absolute top-[40%] right-[20%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-purple-600/20 rounded-full blur-[90px] md:blur-[100px] mix-blend-screen" />
      </div>

      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay pointer-events-none z-0"></div>

      {!joined ? (
        // === PREMIUM LOBBY SCREEN === //
        <div className="relative z-10 w-full max-w-[90%] md:max-w-lg mt-12 md:mt-24 px-4 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700 ease-out">
          <div className="bg-white/[0.04] backdrop-blur-3xl border border-white/10 rounded-3xl md:rounded-[2rem] shadow-2xl p-6 sm:p-10 w-full transform transition-all relative overflow-hidden group">
            {/* Glossy top reflection */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="mb-8 md:mb-10 text-center flex flex-col items-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 rounded-2xl md:rounded-[1.5rem] flex items-center justify-center mb-4 md:mb-6 shadow-[0_0_30px_rgba(99,102,241,0.4)] ring-1 ring-white/20 group-hover:scale-105 transition-transform duration-500">
                <Video className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-md" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent pb-1">
                HiveRTC Server
              </h2>
              <p className="text-slate-400 mt-2 text-xs md:text-sm font-medium tracking-wide max-w-[250px] md:max-w-none mx-auto">
                Next-generation distributed video architecture.
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4 md:space-y-6 w-full">
              <div className="space-y-2 relative group/input">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl blur opacity-0 group-hover/input:opacity-30 transition duration-500 pointer-events-none"></div>
                <input
                  id="room"
                  type="text"
                  placeholder="Enter Room Code..."
                  className="w-full relative bg-[#0a0f1c]/80 backdrop-blur-md border border-white/10 text-white rounded-2xl px-5 md:px-6 py-3 md:py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-slate-500 text-base md:text-lg font-medium shadow-inner"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  disabled={connectionState === "connecting"}
                />
              </div>

              {connectionState === "error" && (
                <div className="bg-red-500/10 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl flex items-center gap-3 text-xs md:text-sm animate-in zoom-in-95 backdrop-blur-md">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                  <p>Failed to establish connection. Ensure the Mediasoup SFU Node is running.</p>
                </div>
              )}

              <button
                disabled={connectionState === "connecting" || !roomIdInput.trim()}
                className="w-full relative overflow-hidden bg-white text-slate-900 disabled:bg-white/10 disabled:text-slate-500 font-bold py-3 md:py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-base md:text-lg disabled:opacity-70 disabled:shadow-none disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed group/btn"
              >
                {connectionState === "connecting" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    Negotiating WebRTC...
                  </>
                ) : (
                  <>
                    <span className="relative z-10 flex items-center gap-2">Join Secure Room <Video className="w-4 h-4 md:w-5 md:h-5 group-hover/btn:translate-x-1 transition-transform" /></span>
                  </>
                )}
              </button>
            </form>
          </div>
          <p className="mt-6 md:mt-8 text-slate-600 text-[10px] md:text-xs font-medium tracking-widest uppercase">Powered by Mediasoup & Redis</p>
        </div>
      ) : (
        // === PREMIUM MEETING ROOM SCREEN === //
        <div className="relative z-10 w-full h-[100dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-700">
          {/* Glass Header */}
          <div className="absolute top-0 left-0 right-0 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between z-50 bg-gradient-to-b from-[#06080e] via-[#06080e]/80 to-transparent pointer-events-none">
            <div className="flex items-center gap-3 md:gap-4 pointer-events-auto max-w-[60%]">
              <div className="hidden sm:flex items-center justify-center w-10 md:w-12 h-10 md:h-12 rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg group hover:bg-white/10 transition-all cursor-pointer">
                <Video className="w-5 md:w-6 h-5 md:h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <h1 className="font-bold text-white tracking-wide text-base md:text-xl drop-shadow-md truncate">
                  {roomIdInput}
                </h1>
                <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-semibold mt-0.5 md:mt-1 flex-wrap">
                  {connectionState === "connected" ? (
                    <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-1.5 md:px-2 py-0.5 rounded border border-white/5">
                      <span className="relative flex h-1.5 md:h-2 w-1.5 md:w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 md:h-2 w-1.5 md:w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-emerald-400 tracking-wide uppercase">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-1.5 md:px-2 py-0.5 rounded border border-white/5">
                      <span className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-amber-400 tracking-wide uppercase">Connecting</span>
                    </div>
                  )}
                  <span className="bg-white/5 backdrop-blur-md px-1.5 md:px-2 py-0.5 rounded border border-white/5 text-slate-300">
                    {videoStreams.length + 1} User{videoStreams.length + 1 !== 1 && 's'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-3">
              <div className="text-[9px] md:text-xs font-bold text-slate-300 bg-white/5 backdrop-blur-xl px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-white/10 shadow-lg tracking-widest flex items-center gap-1.5 md:gap-2">
                <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,1)]"></span>
                SFU ACTIVE
              </div>
            </div>
          </div>

          {/* Main Video Grid */}
          <div className="flex-1 p-2 md:p-6 mt-14 md:mt-20 pb-24 md:pb-28 overflow-y-auto w-full flex items-center justify-center z-10 custom-scrollbar">
            <div className="w-full max-w-7xl h-auto min-h-full flex flex-col justify-center">
              <div
                className={`grid gap-2 sm:gap-4 md:gap-6 w-full h-full ${gridClass} transition-all duration-700 ease-out items-center`}
              >
                {/* Local Video Stream */}
                {localStream && (
                  <div className="relative w-full aspect-video bg-black/40 backdrop-blur-md rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 group hover:ring-indigo-500/50 transition-all duration-300 max-h-full">
                    <VideoPlayer stream={localStream} isLocal={true} />
                    {!isCamOn && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0f1c]/90 backdrop-blur-xl">
                        <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl relative">
                          <div className="absolute inset-0 rounded-full border border-red-500/30 animate-pulse"></div>
                          <VideoOff className="w-6 h-6 md:w-10 md:h-10 text-slate-500" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 flex items-center gap-2 z-20">
                      <div className="bg-[#0a0f1c]/70 backdrop-blur-xl px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold text-white border border-white/10 shadow-lg flex items-center gap-2">
                        You {isMicOn ? "" : <span className="text-red-400 text-[10px] md:text-xs uppercase tracking-widest">(Muted)</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Remote Video Streams */}
                {videoStreams.map((media) => (
                  <div
                    key={media.producerId}
                    className="relative w-full aspect-video bg-black/40 backdrop-blur-md rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 hover:ring-white/30 transition-all duration-300 max-h-full animate-in zoom-in-95 ease-out"
                  >
                    <VideoPlayer stream={media.stream} />
                    <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 z-20">
                      <div className="bg-[#0a0f1c]/70 backdrop-blur-xl px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold text-white border border-white/10 shadow-lg flex items-center gap-2">
                        Participant
                        <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hidden Audio Elements */}
          <div className="hidden">
            {audioStreams.map((media) => (
              <AudioPlayer key={media.producerId} stream={media.stream} />
            ))}
          </div>

          {/* Floating macOS Style Dock */}
          <div className="absolute bottom-4 md:bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none px-4">
            <div className="pointer-events-auto bg-white/10 backdrop-blur-3xl border border-white/10 rounded-2xl md:rounded-[2rem] p-2 md:p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-2 md:gap-3">
              <button
                onClick={toggleMic}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 group relative ${isMicOn
                  ? "bg-white/15 hover:bg-white/25 text-white shadow-inner"
                  : "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-red-400"
                  }`}
              >
                {isMicOn ? (
                  <Mic className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
                ) : (
                  <MicOff className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
                )}
              </button>

              <button
                onClick={toggleCam}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 group relative ${isCamOn
                  ? "bg-white/15 hover:bg-white/25 text-white shadow-inner"
                  : "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-red-400"
                  }`}
              >
                {isCamOn ? (
                  <Video className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
                ) : (
                  <VideoOff className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
                )}
              </button>

              <div className="w-px h-8 md:h-10 bg-white/20 mx-0.5 md:mx-1" />

              <button
                onClick={leaveRoom}
                className="px-5 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl bg-white hover:bg-slate-200 text-red-600 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300 transform font-extrabold flex items-center gap-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <PhoneOff className="w-5 h-5 md:w-6 md:h-6 relative z-10 group-hover:-rotate-12 transition-transform" />
                <span className="relative z-10 hidden sm:block text-sm md:text-base">Leave Call</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
