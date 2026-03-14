import { Server, Socket } from "socket.io";
import * as mediasoup from "mediasoup";
import { roomManager } from "../managers/RoomManager.js";
import { config } from "../config/mediasoup.js";

// Define the shape of our callback responses for better type safety
interface SocketCallback {
  error?: string;
  [key: string]: any;
}

export const setupSocketHandlers = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("User connected: ", socket.id);

    // --- JOIN ROOM ---
    socket.on(
      "join_room",
      async (
        { roomId }: { roomId: string },
        callback: (res: SocketCallback) => void,
      ) => {
        try {
          const room = await roomManager.getOrCreateRoom(roomId);
          roomManager.joinRoom(roomId, socket.id);
          room.addPeer(socket.id);

          socket.join(roomId);

          // PRODUCTION FIX: Get existing producers with correct typing
          const existingProducers: { producerId: string }[] = [];
          room.peers.forEach((peer) => {
            peer.producers.forEach((producer) => {
              existingProducers.push({ producerId: producer.id });
            });
          });

          callback({
            rtpCapabilities: room.router.rtpCapabilities,
            existingProducers,
          });
        } catch (error) {
          console.error("Join Room Error:", error);
          callback({ error: "Failed to join room" });
        }
      },
    );

    // --- CREATE TRANSPORT ---
    socket.on(
      "createWebRtcTransport",
      async (_, callback: (res: SocketCallback) => void) => {
        const room = roomManager.getRoomBySocketId(socket.id);
        const peer = room?.peers.get(socket.id);

        if (!room || !peer)
          return callback({ error: "Room or Peer not found" });

        try {
          const transport = await room.router.createWebRtcTransport(
            config.mediasoup.webRtcTransportOptions,
          );

          peer.transports.set(transport.id, transport);

          callback({
            params: {
              id: transport.id,
              iceParameters: transport.iceParameters,
              iceCandidates: transport.iceCandidates,
              dtlsParameters: transport.dtlsParameters,
            },
          });

          transport.on("dtlsstatechange", (dtlsState) => {
            if (dtlsState === "closed") transport.close();
          });

          transport.on("routerclose", () => transport.close());
        } catch (error) {
          console.error("Create Transport Error:", error);
          callback({ error: "Failed to create transport" });
        }
      },
    );

    // --- CONNECT TRANSPORT ---
    socket.on(
      "transport-connect",
      async (
        {
          transportId,
          dtlsParameters,
        }: {
          transportId: string;
          dtlsParameters: mediasoup.types.DtlsParameters;
        },
        callback: (res?: SocketCallback) => void,
      ) => {
        const room = roomManager.getRoomBySocketId(socket.id);
        const peer = room?.peers.get(socket.id);
        const transport = peer?.transports.get(
          transportId,
        ) as mediasoup.types.WebRtcTransport;

        if (!transport) return callback({ error: "Transport not found" });

        try {
          await transport.connect({ dtlsParameters });
          callback();
        } catch (err: any) {
          callback({ error: err.message });
        }
      },
    );

    // --- PRODUCE ---
    socket.on(
      "produce",
      async (
        {
          transportId,
          kind,
          rtpParameters,
          appData,
        }: {
          transportId: string;
          kind: mediasoup.types.MediaKind;
          rtpParameters: mediasoup.types.RtpParameters;
          appData: any;
        },
        callback: (res: SocketCallback) => void,
      ) => {
        const room = roomManager.getRoomBySocketId(socket.id);
        const peer = room?.peers.get(socket.id);
        const transport = peer?.transports.get(
          transportId,
        ) as mediasoup.types.WebRtcTransport;

        if (!transport) return callback({ error: "Transport not found" });

        try {
          const producer = await transport.produce({
            kind,
            rtpParameters,
            appData,
          });
          peer?.producers.set(producer.id, producer);

          if (room) {
            socket.to(room.roomId).emit("new-producer", {
              producerId: producer.id,
              socketId: socket.id,
            });
          }

          producer.on("transportclose", () => producer.close());

          callback({ id: producer.id });
        } catch (err: any) {
          callback({ error: err.message });
        }
      },
    );

    // --- CONSUME ---
    socket.on(
      "consume",
      async (
        {
          rtpCapabilities,
          remoteProducerId,
          transportId,
        }: {
          rtpCapabilities: mediasoup.types.RtpCapabilities;
          remoteProducerId: string;
          transportId: string;
        },
        callback: (res: SocketCallback) => void,
      ) => {
        const room = roomManager.getRoomBySocketId(socket.id);
        const peer = room?.peers.get(socket.id);
        const transport = peer?.transports.get(
          transportId,
        ) as mediasoup.types.WebRtcTransport;

        if (!room || !transport) return callback({ error: "Setup failed" });

        if (
          !room.router.canConsume({
            producerId: remoteProducerId,
            rtpCapabilities,
          })
        ) {
          return callback({ error: "Cannot consume" });
        }

        try {
          const consumer = await transport.consume({
            producerId: remoteProducerId,
            rtpCapabilities,
            paused: true,
          });

          peer?.consumers.set(consumer.id, consumer);

          consumer.on("transportclose", () => consumer.close());
          consumer.on("producerclose", () => {
            consumer.close();
            peer?.consumers.delete(consumer.id);
            socket.emit("producer-closed", { remoteProducerId });
          });

          callback({
            id: consumer.id,
            producerId: remoteProducerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          });
        } catch (err: any) {
          callback({ error: err.message });
        }
      },
    );

    // --- RESUME CONSUMER ---
    socket.on(
      "consumer-resume",
      async ({ consumerId }: { consumerId: string }) => {
        const room = roomManager.getRoomBySocketId(socket.id);
        const peer = room?.peers.get(socket.id);
        const consumer = peer?.consumers.get(consumerId);

        if (consumer) {
          await consumer.resume();
        }
      },
    );

    socket.on("disconnect", () => {
      roomManager.handleDisconnect(socket.id);
    });
  });
};
