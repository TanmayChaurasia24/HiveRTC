import React, { useEffect, useCallback, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../providers/socket-provider";

const RoomPage = () => {
  const { roomId } = useParams();
  const { socket }: any = useSocket();
  const navigate = useNavigate();

  // State for streams
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // State for controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Refs for video elements to assign streams directly
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const handleNewPeerJoined = (email: string) => {
    console.log("New peer joined:", email);
  };
  useEffect(() => {
    socket.on("user-joined", handleNewPeerJoined);
  },[socket]);

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden flex flex-col">
      {/* --- Header / Room Info --- */}
      <div className="absolute top-0 left-0 z-10 p-4 w-full bg-gradient-to-b from-black/70 to-transparent text-white">
        <h2 className="text-lg font-semibold tracking-wide">
          Live Room: <span className="text-indigo-400">#{roomId}</span>
        </h2>
        <p className="text-xs text-gray-300">
          {remoteStream ? "Connected" : "Waiting for others to join..."}
        </p>
      </div>

      {/* --- Main Video Area (Remote Stream) --- */}
      <div className="flex-1 flex items-center justify-center relative">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-gray-500 flex flex-col items-center">
            <div className="w-20 h-20 border-4 border-t-indigo-500 border-gray-600 rounded-full animate-spin mb-4"></div>
            <p>Waiting for peer connection...</p>
          </div>
        )}
      </div>

      {/* --- Local Video (Picture-in-Picture) --- */}
      {myStream && (
        <div className="absolute top-16 right-4 w-48 h-32 bg-black rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl z-20">
          <video
            ref={myVideoRef}
            autoPlay
            playsInline
            muted // Always mute local video to prevent feedback loop
            className={`w-full h-full object-cover transform scale-x-[-1] ${isVideoOff ? "hidden" : "block"}`}
          />
          {/* Fallback avatar if video is off */}
          {isVideoOff && (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white text-xs">
              Camera Off
            </div>
          )}
          <div className="absolute bottom-1 left-2 text-[10px] text-white bg-black/50 px-2 rounded">
            You
          </div>
        </div>
      )}

      {/* --- Control Bar --- */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-6 bg-slate-800/90 backdrop-blur-sm px-8 py-4 rounded-full shadow-xl border border-slate-700">
        {/* Mic Toggle */}
        <button
          className={`p-4 rounded-full transition-colors duration-200 ${isMuted ? "bg-red-500 hover:bg-red-600" : "bg-slate-700 hover:bg-slate-600"}`}
        >
          {isMuted ? (
            // Mic Off Icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="white"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
              />
            </svg>
          ) : (
            // Mic On Icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="white"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
              />
            </svg>
          )}
        </button>

        {/* Camera Toggle */}
        <button
          className={`p-4 rounded-full transition-colors duration-200 ${isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-slate-700 hover:bg-slate-600"}`}
        >
          {isVideoOff ? (
            // Video Off Icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="white"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
              />
            </svg>
          ) : (
            // Video On Icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="white"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          )}
        </button>

        {/* Leave Call */}
        <button className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors duration-200 shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default RoomPage;
