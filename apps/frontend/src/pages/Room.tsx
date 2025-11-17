// src/pages/RoomPage.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../providers/socket-provider";
import { usePeer } from "../providers/peer-providers"; // path adjust
// no ReactPlayer

const RoomPage = () => {
  const { roomId } = useParams();
  const { socket }: any = useSocket();
  const { peer, addLocalStream, createOffer, createAnswer, addIceCandidate, remoteStream }: any = usePeer();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteEmail, setRemoteEmail] = useState<string>("");

  // Get media
  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setMyStream(stream);
        // show local preview
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        // add tracks to peer so future offers include media
        addLocalStream(stream);
      } catch (err) {
        console.error("getUserMedia error", err);
      }
    };
    getMedia();
  }, [addLocalStream]);

  // Keep remote video element updated when remoteStream changes
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream ?? null;
    }
  }, [remoteStream]);

  // ICE candidate generation -> forward to server
  useEffect(() => {
    const onIce = (ev: RTCPeerConnectionIceEvent) => {
      if (ev.candidate) {
        socket.emit("ice-candidate", { roomId, candidate: ev.candidate });
      }
    };
    peer.addEventListener("icecandidate", onIce);
    return () => peer.removeEventListener("icecandidate", onIce);
  }, [peer, socket, roomId]);

  // Handle negotiationneeded for the sender side (safe stable handler)
  useEffect(() => {
    const onNegotiationNeeded = async () => {
      try {
        // ensure tracks were added already
        const offer = await createOffer();
        // send offer to other peer(s) via server
        socket.emit("call-user", { roomId, offer });
      } catch (err) {
        console.error("negotiationneeded error", err);
      }
    };

    peer.addEventListener("negotiationneeded", onNegotiationNeeded);
    return () => peer.removeEventListener("negotiationneeded", onNegotiationNeeded);
  }, [peer, createOffer, socket, roomId]);

  // Socket handlers
  useEffect(() => {
    socket.on("user-joined", async ({ email }: any) => {
      // optional: UI update
      console.log("user joined:", email);
      setRemoteEmail(email);
      // For caller -> start offer if not already created
      // We'll rely on negotiationneeded in many cases; optionally force
      // But ensure local tracks are added first (we already called addLocalStream)
      try {
        const offer = await createOffer();
        socket.emit("call-user", { roomId, offer, to: email });
      } catch (e) {
        console.error("createOffer on user-joined failed", e);
      }
    });

    socket.on("incoming-call", async (data: any) => {
      const { from, offer } = data;
      console.log("incoming-call", from, offer);
      setRemoteEmail(from);

      // Validate offer
      if (!offer || !offer.type || !offer.sdp) {
        console.error("Invalid offer", offer);
        return;
      }

      // set remote + create answer
      const answer = await createAnswer(offer);
      socket.emit("call-accepted", { roomId, answer, to: from });
    });

    socket.on("incoming-call-accepted", async (data: any) => {
      const { from, answer } = data;
      console.log("incoming-call-accepted", from, answer);

      if (!answer || !answer.type || !answer.sdp) {
        console.error("Invalid answer", answer);
        return;
      }

      try {
        await peer.setRemoteDescription(answer);
      } catch (err) {
        console.error("setRemoteDescription failed on accepted call", err, answer);
      }
    });

    // ICE candidate from remote
    socket.on("ice-candidate", async (data: any) => {
      const { candidate } = data;
      if (candidate) {
        try {
          await addIceCandidate(candidate);
        } catch (err) {
          console.warn("failed to add remote ICE candidate", err);
        }
      }
    });

    // join the room on mount
    socket.emit("join-room", { roomId });

    return () => {
      socket.off("user-joined");
      socket.off("incoming-call");
      socket.off("incoming-call-accepted");
      socket.off("ice-candidate");
    };
  }, [socket, peer, createOffer, createAnswer, addIceCandidate, roomId]);

  return (
    <div className="w-full h-screen bg-slate-900">
      <div className="p-4 text-white">
        <div>Room: {roomId}</div>
        <div>Connected to: {remoteEmail || "none"}</div>
      </div>

      <div className="flex gap-4 p-4">
        <div>
          <h4 className="text-white">Local</h4>
          <video ref={localVideoRef} autoPlay muted playsInline style={{ width: 320, height: 240, background: "#000" }} />
        </div>

        <div>
          <h4 className="text-white">Remote</h4>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 640, height: 480, background: "#000" }} />
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
