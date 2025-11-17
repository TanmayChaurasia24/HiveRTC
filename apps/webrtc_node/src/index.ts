import express from "express";
import { Server } from "socket.io";
import http from "http";

const app = express();

app.use(express.json());

const httpserver = http.createServer(app);

const io = new Server(httpserver, {
  cors: {
    origin: "*",
  },
});

const email_to_socket_mapping = new Map();

io.on("connection", (socket) => {
    console.log("a user connected");

    socket.on("join-room", (data) => {
    const { roomid, email } = data;
    console.log("user joined room", roomid, email);
    email_to_socket_mapping.set(email, socket.id);
    socket.join(roomid);
    socket.emit("joined-room", {roomid});
    socket.broadcast.to(roomid).emit("user-joined", email);
  });
});

httpserver.listen(4040, () => {
  console.log("Server is running on port 4040");
});
