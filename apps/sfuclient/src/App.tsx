import { useState, useRef, useEffect } from "react";
import { useSFU } from "./hooks/useSFU";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, AlertCircle } from "lucide-react";

// Helper components for UI
function VideoPlayer({ stream, isLocal = false }: { stream: MediaStream; isLocal?: boolean }) {
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
      className={`w-full h-full object-cover rounded-2xl shadow-xl ring-1 ring-slate-800 ${
        isLocal ? "scale-x-[-1]" : ""
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
      audioRef.current.play().catch((e) => console.log("Audio play blocked", e));
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

  // Dynamic grid configuration based on total videos (including local)
  const totalVideos = videoStreams.length + 1; // 1 for local
  let gridClass = "grid-cols-1 md:grid-cols-2";
  if (totalVideos === 1) gridClass = "grid-cols-1";
  else if (totalVideos === 2) gridClass = "grid-cols-1 md:grid-cols-2";
  else if (totalVideos <= 4) gridClass = "grid-cols-2 md:grid-cols-2";
  else if (totalVideos <= 6) gridClass = "grid-cols-2 md:grid-cols-3";
  else gridClass = "grid-cols-3 md:grid-cols-4";

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30 font-sans flex flex-col items-center">
      {/* Background Enhancements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-indigo-600/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
      </div>

      {!joined ? (
        // === LOBBY SCREEN === //
        <div className="relative z-10 w-full max-w-md mt-32 px-4 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-700/50 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] p-10 w-full transform transition-all">
            <div className="mb-10 text-center">
              <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/30">
                <Video className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                HiveRTC SFU
              </h2>
              <p className="text-slate-400 mt-3 text-sm font-medium">
                Enter a room ID to start conferencing instantly.
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-6">
              <div className="space-y-2">
                <input
                  id="room"
                  type="text"
                  placeholder="e.g. daily-standup"
                  className="w-full bg-slate-950/50 border border-slate-700/50 text-white rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-600 text-lg shadow-inner font-medium"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  disabled={connectionState === "connecting"}
                />
              </div>

              {connectionState === "error" && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5" />
                  Failed to connect. Check server status.
                </div>
              )}

              <button
                disabled={connectionState === "connecting" || !roomIdInput.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] flex items-center justify-center gap-2 text-lg disabled:opacity-70 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
              >
                {connectionState === "connecting" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting to Node...
                  </>
                ) : (
                  "Join Room"
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        // === MEETING ROOM SCREEN === //
        <div className="relative z-10 w-full h-screen flex flex-col overflow-hidden animate-in fade-in duration-700">
          
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-900/40 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-slate-100 flex items-center gap-2 text-lg">
                  {roomIdInput}
                </h1>
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  {connectionState === "connected" ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-green-400">Connected</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      <span className="text-slate-400">Connecting...</span>
                    </>
                  )}
                  <span className="text-slate-600 mx-1">•</span>
                  <span className="text-slate-400">{videoStreams.length + 1} Participants</span>
                </div>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-slate-500 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              MEDIASOUP V3
            </div>
          </div>

          {/* Main Video Grid */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto w-full flex items-center justify-center">
             <div className="w-full max-w-7xl">
                <div className={`grid gap-4 md:gap-6 w-full ${gridClass} transition-all duration-500`}>
                  
                  {/* Local Video Stream */}
                  {localStream && (
                    <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
                      <VideoPlayer stream={localStream} isLocal={true} />
                      {!isCamOn && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-md">
                          <div className="w-20 h-20 rounded-full bg-slate-800/80 flex items-center justify-center border border-white/5 shadow-2xl">
                            <VideoOff className="w-8 h-8 text-slate-400" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4 flex items-center gap-2">
                        <div className="bg-black/60 backdrop-blur-lg px-3 py-1.5 rounded-xl text-xs md:text-sm font-semibold text-white border border-white/10 shadow-lg">
                          You {isMicOn ? "" : "(Muted)"}
                        </div>
                        {!isMicOn && (
                          <div className="bg-red-500/80 backdrop-blur-lg p-1.5 rounded-lg border border-white/10 shadow-lg animate-pulse">
                            <MicOff className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Remote Video Streams */}
                  {videoStreams.map((media) => (
                    <div key={media.producerId} className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-500">
                      <VideoPlayer stream={media.stream} />
                      <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4">
                        <div className="bg-black/60 backdrop-blur-lg px-3 py-1.5 rounded-xl text-xs md:text-sm font-semibold text-white border border-white/10 shadow-lg">
                          Participant
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

          {/* Controls Bar */}
          <div className="pb-6 pt-2 px-6">
            <div className="max-w-fit mx-auto bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-3 shadow-2xl flex items-center gap-4">
              
              <button
                onClick={toggleMic}
                className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg ${
                  isMicOn
                    ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-600"
                    : "bg-red-500 text-white shadow-red-500/40"
                }`}
                title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
              >
                {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>

              <button
                onClick={toggleCam}
                className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg ${
                  isCamOn
                    ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-600"
                    : "bg-red-500 text-white shadow-red-500/40"
                }`}
                title={isCamOn ? "Turn Camera Off" : "Turn Camera On"}
              >
                {isCamOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </button>

              <div className="w-px h-10 bg-slate-700/50 mx-2" />

              <button
                onClick={leaveRoom}
                className="p-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/30 transition-all duration-300 transform hover:scale-105 active:scale-95 border border-red-500 group flex items-center gap-2"
                title="Leave Meeting"
              >
                <PhoneOff className="w-6 h-6" />
                <span className="font-bold tracking-wide pr-2 hidden sm:block delay-100 group-hover:block animate-in fade-in slide-in-from-left-2 duration-300">
                  Leave
                </span>
              </button>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}