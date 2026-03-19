import * as mediasoup from "mediasoup";
import { workerManager } from "./WorkerManager.js";

interface Peer {
  id: string;
  transports: Map<
    string,
    mediasoup.types.WebRtcTransport | mediasoup.types.PipeTransport
  >;
  producers: Map<string, mediasoup.types.Producer>;
  consumers: Map<string, mediasoup.types.Consumer>;
}

class Room {
  public peers: Map<string, Peer> = new Map();

  constructor(
    public roomId: string,
    public router: mediasoup.types.Router,
  ) {}

  addPeer(peerId: string) {
    this.peers.set(peerId, {
      id: peerId,
      transports: new Map(), 
      producers: new Map(),
      consumers: new Map(),
    });
  }

  removePeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.transports.forEach((t) => t.close());
    }
    this.peers.delete(peerId);
  }

  async pipeToRemoteNode(producerId: string) {
    try {
      const localPipeTransport: any = await this.router.createPipeTransport({
        //@ts-ignore
        listenInfo: {
          protocol: "udp",
          ip: "0.0.0.0",
          announcedAddress: process.env.ANNOUNCED_IP,
        },
        enableSctp: true,
      });

      return localPipeTransport;
    } catch (error) {
      console.error("Pipe transport creation failed:", error);
    }
  }
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map();

  async getOrCreateRoom(roomId: string): Promise<Room> {
    let room = this.rooms.get(roomId);

    if (!room) {
      console.log(`Creating new room: ${roomId}`);
      const router = await workerManager.createRouter();
      room = new Room(roomId, router);
      this.rooms.set(roomId, room);
    }

    return room;
  }

  joinRoom(roomId: string, socketId: string) {
    this.socketToRoom.set(socketId, roomId);
  }

  handleDisconnect(socketId: string) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.removePeer(socketId);

      if (room.peers.size === 0) {
        console.log(`Closing empty room: ${roomId}`);
        room.router.close();
        this.rooms.delete(roomId);
      }
    }

    this.socketToRoom.delete(socketId);
  }

  getRoomBySocketId(socketId: string): Room | undefined {
    const roomId = this.socketToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }
}

export const roomManager = new RoomManager();
