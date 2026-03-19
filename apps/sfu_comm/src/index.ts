import express from "express";
import http from "http";
import { Server } from "socket.io";
import { setupSocketHandlers } from "./socket/socketHandler.js";
import { workerManager } from "./managers/WorkerManager.js";
import { redisService } from "./services/RedisService.js";

(async () => {
  await redisService.connect();
  await workerManager.init();

  const app = express();
  app.use(express.json());
  
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: "*" },
  });

  setupSocketHandlers(io);

  app.options("/join-room", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.sendStatus(200);
  });

  app.post("/join-room", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const { roomId } = req.body;
    let nodeIp: any = await redisService.getRoomLocation(roomId);

    if (!nodeIp) {
      nodeIp = await redisService.getLeastLoadedNode();
      await redisService.setRoomLocation(roomId, nodeIp);
    }

    res.json({ serverURL: `ws://${nodeIp}:3002`, roomId });
  });

  server.listen(3002, () => {
    console.log("Server listening on port 3002");
  });
})();
