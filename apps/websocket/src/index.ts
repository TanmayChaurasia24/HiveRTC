import { WebSocketServer } from 'ws';
import { User } from './User.js';

const wss = new WebSocketServer({ port: 3001 });

wss.on('connection', function connection(ws: any) {
  let user = new User(ws);
  console.log("user connected, id:", user.id);
  ws.on('error', console.error);

  ws.on('close', () => {
    console.log("user disconnected, id:", user.id, "userId:", user.userId);
    user?.destroy();
  });
});