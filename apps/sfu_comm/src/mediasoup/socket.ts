import { Server } from "socket.io";
import { getWorker } from "./worker.js";
import { config } from "../config.js";
import { Room } from "./room.js";

const rooms = new Map<string, Room>();

export const setupSocket = (io: Server) => {
  io.on("connection", (socket) => {
    console.log("Client connected: ", socket.id);

    socket.on("joinRoom", async ({ roomId }, cb) => {
      console.log(`Client ${socket.id} joining room ${roomId}`);

      let room = rooms.get(roomId);

      if (!room) {
        const worker = getWorker();
        const router = await worker.createRouter({
          mediaCodecs: config.mediasoup.router.mediaCodecs,
        });
        room = new Room(roomId, router);
        rooms.set(roomId, room);
      }

      room.addPeer(socket.id);
      socket.join(roomId);
      cb(room.router.rtpCapabilities);
    });

    socket.on("createTransport", async ({ roomId }, cb) => {
      const room = rooms.get(roomId);
      const peer = room?.peers.get(socket.id)!;

      const transport: any = await room?.router.createWebRtcTransport(
        config.mediasoup.webRtcTransport as any
      );

      peer.transports.set(transport.id, transport);

      cb({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });
    });

    socket.on(
      "connectTransport",
      async ({ roomId, transportId, dtlsParameters }, cb) => {
        const room = rooms.get(roomId)!;
        const peer = room?.peers.get(socket.id)!;

        const transport = peer.transports.get(transportId);
        if (!transport) return;

        await transport.connect({ dtlsParameters });
        cb();
      }
    );
  });
};
