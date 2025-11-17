import React from "react";
import { useMemo } from "react";

const PeerContext = React.createContext<any>(null);

export const usePeer = () => {
    return React.useContext(PeerContext);
}

export const PeerProvider = (props: any) => {
  const peer = useMemo(
    () =>
      new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      }),
    []
  );

  const createOffer = async () => {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    return offer;
  };
  return (
    <PeerContext.Provider value={{ peer, createOffer }}>
      {props.children}
    </PeerContext.Provider>
  );
};
