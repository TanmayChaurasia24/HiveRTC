// src/pages/RoomPage.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../providers/socket-provider";

const RoomPage = () => {
  const { roomid } = useParams();
  const { socket }: any = useSocket();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteEmail, setRemoteEmail] = useState<string>("");

  // 1. Handle Local Stream
  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setMyStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        // SFU: Send stream to mediasoup Transport here
      } catch (err) {
        console.error("getUserMedia error", err);
      }
    };
    getMedia();
  }, []);

  // 2. Socket Signaling Logic (SFU version goes here)
  useEffect(() => {
    const handleUserJoined = async (email: string) => {
      console.log("user joined:", email);
      setRemoteEmail(email);
      // SFU: Notify others or do Mediasoup transport consume
    };

    socket.on("user-joined", handleUserJoined);

    return () => {
      socket.off("user-joined", handleUserJoined);
    };
  }, [socket, roomid]);

  return (
    <div className="w-full h-screen bg-slate-900">
      <div className="p-4 text-white">
        <div>Room: {roomid}</div>
        <div>Connected to: {remoteEmail || "Waiting..."}</div>
      </div>

      <div className="flex gap-4 p-4">
        <div>
          <h4 className="text-white">Local</h4>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-[320px] h-[240px] bg-black object-cover"
          />
        </div>

        <div>
          <h4 className="text-white">Remote (SFU Streams)</h4>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-[640px] h-[480px] bg-black object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
