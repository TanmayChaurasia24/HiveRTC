// src/providers/peer-provider.tsx
import React, { useEffect, useMemo, useState } from "react";

const PeerContext = React.createContext<any>(null);

export const usePeer = () => React.useContext(PeerContext);

export const PeerProvider = ({ children }: any) => {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peer = useMemo(() => {
    return new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:global.stun.twilio.com:3478",
          ],
        },
      ],
    });
  }, []);

  // When remote track arrives set remote stream
  useEffect(() => {
    const onTrack = (event: RTCTrackEvent) => {
      // event.streams usually contains the MediaStream
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        // Fallback: create stream from tracks
        const inbound = new MediaStream();
        inbound.addTrack(event.track);
        setRemoteStream(inbound);
      }
    };

    peer.addEventListener("track", onTrack);
    return () => peer.removeEventListener("track", onTrack);
  }, [peer]);

  // ICE candidate local -> should be sent to remote via signaling outside
  useEffect(() => {
    const onIceCandidate = (ev: RTCPeerConnectionIceEvent) => {
      if (ev.candidate) {
        // caller will listen to this via peerContext (you'll need to emit via socket)
        // We will expose candidate events via peer.onicecandidate externally (below)
        // But also keep this if you want to debug
        console.debug("Local ICE candidate:", ev.candidate);
      }
    };
    peer.addEventListener("icecandidate", onIceCandidate);
    return () => peer.removeEventListener("icecandidate", onIceCandidate);
  }, [peer]);

  // Exposed helpers

  // Add local tracks (call this before createOffer)
  const addLocalStream = (stream: MediaStream) => {
    // Remove previously added senders for the same track kinds to avoid duplicates
    const existingSenders = peer.getSenders();
    for (const track of stream.getTracks()) {
      const sender = existingSenders.find(
        (s) => s.track && s.track.kind === track.kind
      );
      if (!sender) {
        peer.addTrack(track, stream);
      } else {
        // optionally replaceTrack: sender.replaceTrack(track) if supported
        try {
          if (sender.replaceTrack) sender.replaceTrack(track);
        } catch (e) {
          // ignore
        }
      }
    }
  };

  // Create offer — make sure addLocalStream was called first
  const createOffer = async () => {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    console.log("Created offer:", offer);
    return { type: offer.type, sdp: offer.sdp };
  };

  // Create answer after remote offer is set. (offer should be plain {type,sdp})
  const createAnswer = async (receivedOffer: RTCSessionDescriptionInit) => {
    await peer.setRemoteDescription(receivedOffer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    console.log("Created answer:", answer);
    return { type: answer.type, sdp: answer.sdp };
  };

  return (
    <PeerContext.Provider
      value={{
        peer,
        addLocalStream,
        createOffer,
        createAnswer,
        remoteStream,
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};
