import { useRef, useState } from "react";
import { joinRoom } from "../../../sfuclient/src/webtrc/mediasoup";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from "lucide-react";

export default function Sfulobby() {
  const localVideo = useRef<HTMLVideoElement>(null);
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // UI States for controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId) return;

    setIsLoading(true);
    try {
      const stream: any = await joinRoom(roomId);
      if (localVideo.current) {
        localVideo.current.srcObject = stream;
      }
      setJoined(true);
    } catch (error) {
      console.error("Failed to join:", error);
      alert("Failed to join room. Check console.");
    } finally {
      setIsLoading(false);
    }
  }

  const toggleMic = () => {
    // Note: Add actual track logic here later
    setIsMicOn(!isMicOn);
  };

  const toggleCam = () => {
    // Note: Add actual track logic here later
    setIsCamOn(!isCamOn);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 selection:bg-indigo-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      {!joined ? (
        // === JOIN CARD ===
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8">
            <div className="mb-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-blue-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                <Video className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Join Meeting
              </h2>
              <p className="text-slate-400 mt-2 text-sm">
                Enter a room ID to start streaming
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="room"
                  className="text-sm font-medium text-slate-300 ml-1"
                >
                  Room ID
                </label>
                <input
                  id="room"
                  type="text"
                  placeholder="e.g. daily-standup"
                  className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                />
              </div>

              <button
                disabled={isLoading || !roomId}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Join Room"
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        // === VIDEO INTERFACE ===
        <div className="relative z-10 w-full max-w-5xl flex flex-col gap-4 animate-in fade-in duration-500">
          {/* Header */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h1 className="font-medium text-slate-200">
                Room: <span className="text-indigo-400">{roomId}</span>
              </h1>
            </div>
            <div className="text-xs font-mono text-slate-500">MEDIASOUP-V3</div>
          </div>

          {/* Video Grid */}
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 ring-1 ring-white/10 group">
            <video
              ref={localVideo}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover transform transition-transform duration-500 ${!isCamOn ? "opacity-0" : "opacity-100"}`}
            />

            {/* Camera Off Placeholder */}
            {!isCamOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center">
                  <VideoOff className="w-10 h-10 text-slate-500" />
                </div>
              </div>
            )}

            {/* Name Tag */}
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium text-white border border-white/10">
              You {isMicOn ? "" : "(Muted)"}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={toggleMic}
              className={`p-4 rounded-full transition-all duration-200 ${
                isMicOn
                  ? "bg-slate-800 hover:bg-slate-700 text-white"
                  : "bg-red-500/10 text-red-500 hover:bg-red-500/20 ring-1 ring-red-500/50"
              }`}
            >
              {isMicOn ? (
                <Mic className="w-6 h-6" />
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </button>

            <button
              onClick={toggleCam}
              className={`p-4 rounded-full transition-all duration-200 ${
                isCamOn
                  ? "bg-slate-800 hover:bg-slate-700 text-white"
                  : "bg-red-500/10 text-red-500 hover:bg-red-500/20 ring-1 ring-red-500/50"
              }`}
            >
              {isCamOn ? (
                <Video className="w-6 h-6" />
              ) : (
                <VideoOff className="w-6 h-6" />
              )}
            </button>

            <button
              onClick={() => window.location.reload()}
              className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 transition-all hover:scale-105 active:scale-95"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
