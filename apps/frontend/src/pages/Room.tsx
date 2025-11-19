// src/pages/RoomPage.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../providers/socket-provider";
import { usePeer } from "../providers/peer-providers";

const RoomPage = () => {
  const { roomid } = useParams();
  const { socket }: any = useSocket();
  const { peer, addLocalStream, createOffer, createAnswer, remoteStream } =
    usePeer();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // FIX: A queue to store candidates that arrive before the connection is ready
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);

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

        // IMPORTANT: Add stream immediately so it's ready for offers
        addLocalStream(stream);
      } catch (err) {
        console.error("getUserMedia error", err);
      }
    };
    getMedia();
  }, [addLocalStream]);

  // 2. Handle Remote Stream Update
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // 3. Socket Signaling & ICE Handling Logic
  useEffect(() => {
    // Helper: Process queued candidates
    const processCandidateQueue = async () => {
      if (peer.remoteDescription && iceCandidatesQueue.current.length > 0) {
        console.log("Processing pending ICE candidates...");
        while (iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift();
          if (candidate) {
            try {
              await peer.addIceCandidate(candidate);
            } catch (e) {
              console.error("Error adding queued ice candidate", e);
            }
          }
        }
      }
    };

    // -- SOCKET LISTENERS --

    const handleUserJoined = async (email: string) => {
      console.log("user joined:", email);
      setRemoteEmail(email);
      const offer = await createOffer();
      socket.emit("call-user", { offer, email });
    };

    const handleIncomingCall = async (data: any) => {
      const { fromEmail, offer } = data;
      console.log("incoming-call from", fromEmail);
      setRemoteEmail(fromEmail);

      // 1. Set Remote Description FIRST
      // We manually set this here to ensure order before processing candidates
      await peer.setRemoteDescription(new RTCSessionDescription(offer));

      // 2. Process any ICE candidates that arrived while we were waiting
      await processCandidateQueue();

      // 3. Ensure Local Stream exists
      let stream = myStream;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setMyStream(stream);
        addLocalStream(stream);
      }

      // 4. Create Answer
      const answer = await createAnswer(offer);
      socket.emit("call-accepted", { roomid, answer, to: fromEmail });
    };

    const handleCallAccepted = async (data: any) => {
      const { from, answer } = data;
      console.log("call accepted by", from);

      // 1. Set Remote Description
      await peer.setRemoteDescription(new RTCSessionDescription(answer));

      // 2. Process any ICE candidates that arrived while we were waiting
      await processCandidateQueue();
    };

    const handleIceCandidateEvent = async (data: any) => {
      const { candidate } = data;
      const iceCandidate = new RTCIceCandidate(candidate);

      if (peer.remoteDescription) {
        // Connection ready? Add immediately
        try {
          await peer.addIceCandidate(iceCandidate);
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      } else {
        // Connection not ready? Queue it
        console.warn("Remote description not set. Queueing candidate.");
        iceCandidatesQueue.current.push(iceCandidate);
      }
    };

    socket.on("user-joined", handleUserJoined);
    socket.on("incoming-call", handleIncomingCall);
    socket.on("incoming-call-accepted", handleCallAccepted);
    socket.on("ice-candidate", handleIceCandidateEvent);

    return () => {
      socket.off("user-joined", handleUserJoined);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("incoming-call-accepted", handleCallAccepted);
      socket.off("ice-candidate", handleIceCandidateEvent);
    };
  }, [
    socket,
    peer,
    createOffer,
    createAnswer,
    roomid,
    myStream,
    addLocalStream,
  ]);

  // 4. Emit Local ICE Candidates
  useEffect(() => {
    const handleIceCandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          candidate: event.candidate,
          to: remoteEmail,
          roomid,
        });
      }
    };

    peer.addEventListener("icecandidate", handleIceCandidate);
    return () => {
      peer.removeEventListener("icecandidate", handleIceCandidate);
    };
  }, [peer, socket, remoteEmail, roomid]);

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
          <h4 className="text-white">Remote</h4>
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
