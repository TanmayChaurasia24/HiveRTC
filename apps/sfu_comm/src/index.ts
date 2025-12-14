import express from "express";
import http from "http";
import { Server } from "socket.io";
import { setupSocket } from "./mediasoup/socket.js";
import { createWorkers } from "./mediasoup/worker.js";

(async () => {
  await createWorkers();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  setupSocket(io);

  server.listen(3000, () => {
    console.log("Server listening on port 3000");
  });
})();
