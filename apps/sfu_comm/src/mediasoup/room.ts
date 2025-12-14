import { Peer } from "./peer.js";
import * as mediasoup from "mediasoup";

type Router = mediasoup.types.Router;

export class Room {
  peers = new Map<string, Peer>();

  constructor(
    public socketid: string,
    public router: Router
  ) {}

  addPeer(socketid: string) {
    const peer = new Peer(socketid);
    this.peers.set(socketid, peer);
    return peer;
  }

  removePeer(socketid: string) {
    const peer = this.peers.get(socketid);
    if (!peer) return;

    peer.transports.forEach((t) => t.close());
    peer.producers.forEach((p) => p.close());
    peer.consumers.forEach((c) => c.close());
    this.peers.delete(socketid);
  }
}
