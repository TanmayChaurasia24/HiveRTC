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
const socket_to_email_mapping = new Map();

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("join-room", (data) => {
    const { roomid, email } = data;
    console.log("user joined room", roomid, email);
    email_to_socket_mapping.set(email, socket.id);
    socket_to_email_mapping.set(socket.id, email);
    socket.join(roomid);
    socket.emit("joined-room", { roomid });
    socket.broadcast.to(roomid).emit("user-joined", email);
  });

  socket.on("call-user", (data) => {
    const { email, offer } = data;
    const fromEmail = socket_to_email_mapping.get(socket.id);
    const toSocketid = email_to_socket_mapping.get(email);
    socket.to(toSocketid).emit("incoming-call", { from: fromEmail, offer });
  });

  socket.on("call-accepted", (data: any) => {
    const {email, answer} = data;
    const toSocketid = email_to_socket_mapping.get(email);
    socket.to(toSocketid).emit("incoming-call-accepted", answer);
  })

  // --- NEW: ICE Candidate Signaling ---
  socket.on("ice-candidate", ({ to, candidate }) => {
    const socketId = email_to_socket_mapping.get(to);
    socket.to(socketId).emit("incoming-ice-candidate", { candidate });
  });

});

httpserver.listen(4040, () => {
  console.log("Server is running on port 4040");
});
