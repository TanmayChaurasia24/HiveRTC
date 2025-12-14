sfu-app/
├── server/
│   ├── src/
│   │   ├── index.ts              # Entry point
│   │   ├── config.ts             # Mediasoup + app config
│   │   ├── redis.ts              # Redis client
│   │   ├── socket.ts             # Socket.IO logic
│   │   ├── mediasoup/
│   │   │   ├── worker.ts         # Worker pool
│   │   │   ├── room.ts           # Room logic
│   │   │   └── peer.ts           # Peer state
│   │   └── utils.ts
│   ├── tsconfig.json
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── index.ts              # Entry
│   │   ├── socket.ts
│   │   ├── mediasoup.ts
│   │   └── ui.ts
│   └── index.html
│
└── README.md
