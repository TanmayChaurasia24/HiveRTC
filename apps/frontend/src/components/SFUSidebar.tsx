import { Users, Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { useEffect, useRef } from "react";

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

interface SFUSidebarProps {
  onLeave: () => void;
  spaceId: string;
  toggleCam: () => void;
  toggleMic: () => void;
  isMicOn: boolean;
  isCamOn: boolean;
  joined: boolean;
  connectionState: string;
  localStream: MediaStream | null;
  remoteMedia: any[];
}

export const SFUSidebar = ({
  onLeave,
  spaceId,
  toggleCam,
  toggleMic,
  isMicOn,
  isCamOn,
  joined,
  connectionState,
  localStream,
  remoteMedia
}: SFUSidebarProps) => {

  const videoStreams = remoteMedia.filter((m) => m.kind === "video");
  const audioStreams = remoteMedia.filter((m) => m.kind === "audio");

  const totalVideos = videoStreams.length + (localStream ? 1 : 0);
  let gridClass = "grid-cols-1";
  if (totalVideos === 1) gridClass = "grid-cols-1";
  else if (totalVideos === 2) gridClass = "grid-cols-1 md:grid-cols-2";
  else gridClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3";

  return (
    <div className="w-[30%] bg-[#06080e] border-l border-zinc-900 flex flex-col relative z-20 h-full pointer-events-auto shadow-2xl overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[5%] left-[10%] w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute bottom-[20%] right-[10%] w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-md text-white relative z-10 w-full shadow-md">
        <div className="flex flex-col">
          <h2 className="font-semibold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,1)]"></div>
            Room: {spaceId.slice(0, 8)}...
          </h2>
          <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold mt-1">
            {connectionState === "connected" ? (
              <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded border border-white/5 text-emerald-400">
                Connected
              </div>
            ) : connectionState === "connecting" ? (
              <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded border border-white/5 text-amber-400">
                Connecting...
              </div>
            ) : (
                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded border border-white/5 text-red-400">
                Disconnected
              </div>
            )}
            <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 text-slate-300">
              {totalVideos} User{totalVideos !== 1 && 's'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-3 md:p-4 flex flex-col justify-start items-center overflow-y-auto relative z-10 custom-scrollbar">
        {!joined ? (
           <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
             <div className="loader-spinner mb-4 border-t-indigo-500" />
             <p className="text-white text-sm font-medium">Negotiating Connection...</p>
             <p className="text-white/50 text-xs mt-1">Powered by Mediasoup</p>
           </div>
        ) : (
          <div className={`grid gap-3 w-full h-auto ${gridClass} items-start`}>
            {/* Local Video Stream */}
            {localStream && (
              <div className="relative w-full aspect-video bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 hover:ring-indigo-500/50 transition-all duration-300">
                <VideoPlayer stream={localStream} isLocal={true} />
                {!isCamOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0a0f1c]/90 backdrop-blur-xl">
                    <VideoOff className="w-8 h-8 text-slate-500" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 z-20">
                  <div className="bg-[#0a0f1c]/70 backdrop-blur-xl px-2 py-1 rounded-lg text-xs font-semibold text-white border border-white/10 shadow-lg">
                    You {isMicOn ? "" : <span className="text-red-400 text-[10px] ml-1">(Muted)</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Remote Video Streams */}
            {videoStreams.map((media: any) => (
              <div
                key={media.producerId}
                className="relative w-full aspect-video bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 ease-out"
              >
                <VideoPlayer stream={media.stream} />
                <div className="absolute bottom-2 left-2 z-20">
                  <div className="bg-[#0a0f1c]/70 backdrop-blur-xl px-2 py-1 rounded-lg text-xs font-semibold text-white border border-white/10 shadow-lg flex items-center gap-2">
                    Participant <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden Audio Elements */}
      <div className="hidden">
        {audioStreams.map((media: any) => (
          <AudioPlayer key={media.producerId} stream={media.stream} />
        ))}
      </div>

      {/* Bottom Controls */}
      <div className="p-4 bg-black/40 backdrop-blur-md border-t border-white/5 relative z-10 flex justify-center gap-3">
        <button
          onClick={toggleMic}
          className={`p-3 rounded-2xl transition-all duration-300 group ${isMicOn
            ? "bg-white/10 hover:bg-white/20 text-white shadow-inner"
            : "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-red-400"
            }`}
        >
          {isMicOn ? <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" /> : <MicOff className="w-5 h-5 group-hover:scale-110 transition-transform" />}
        </button>

        <button
          onClick={toggleCam}
          className={`p-3 rounded-2xl transition-all duration-300 group ${isCamOn
            ? "bg-white/10 hover:bg-white/20 text-white shadow-inner"
            : "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-red-400"
            }`}
        >
          {isCamOn ? <Video className="w-5 h-5 group-hover:scale-110 transition-transform" /> : <VideoOff className="w-5 h-5 group-hover:scale-110 transition-transform" />}
        </button>

        <div className="w-px h-11 bg-white/10 mx-1" />

        <button
          onClick={onLeave}
          className="px-5 py-3 rounded-2xl bg-white hover:bg-slate-200 text-red-600 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300 font-bold flex items-center gap-2 group overflow-hidden relative cursor-pointer"
        >
          <PhoneOff className="w-5 h-5 relative z-10 group-hover:-rotate-12 transition-transform" />
          <span className="text-sm relative z-10 hidden sm:block">Leave Call</span>
        </button>
      </div>
    </div>
  );
};
