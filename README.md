<p align="center">
  <img src="https://img.shields.io/badge/HiveRTC-SDK-6366f1?style=for-the-badge&logo=webrtc&logoColor=white" alt="HiveRTC SDK" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/mediasoup-SFU-e91e63?style=for-the-badge" alt="mediasoup" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge" alt="MIT License" />
</p>

# 🐝 HiveRTC — Real-Time Video Conferencing SDK

> **Build Zoom-like meeting rooms in 10 lines of code.** HiveRTC is a full-stack, SFU-based WebRTC platform that ships as an installable SDK — any developer can `npm install @hivertc/sdk` and add HD video calling, screen sharing, chat, spatial audio, and more to their app without touching WebRTC internals.

---

## ✨ Key Features

| Feature | Description | Status |
|---------|-------------|--------|
| 🎥 **HD Video/Audio** | SFU-routed media via mediasoup | ✅ |
| 🖥️ **Screen Sharing** | Native `getDisplayMedia` integration | ✅ |
| 💬 **In-Meeting Chat** | Real-time message relay via Socket.io | ✅ |
| 🗣️ **Active Speaker** | Web Audio API volume analysis | ✅ |
| ✋ **Hand Raise** | Peer-to-peer state signaling | ✅ |
| 🎙️ **Recording** | Client-side MediaRecorder API capture | ✅ |
| 📡 **Network Monitor** | WebRTC transport stats for connection health | ✅ |
| 🎧 **3D Spatial Audio** | HRTF-based positional audio via Web Audio API | ✅ |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                    HiveRTC Monorepo                   │
├──────────────┬──────────────┬────────────────────────┤
│   apps/      │  packages/   │                        │
│              │              │                        │
│  sfu_comm    │  sdk         │  @hivertc/sdk          │
│  (SFU Server)│  (Core SDK)  │  Framework-agnostic    │
│              │              │  WebRTC + Signaling     │
│  sfuclient   │  react       │                        │
│  (Demo App)  │  (Bindings)  │  @hivertc/react        │
│              │              │  Hooks + Components     │
│  frontend    │  database    │                        │
│  (Metaverse) │  redis       │  Shared infra          │
│  websocket   │  ui          │                        │
│  httpserver   │              │                        │
└──────────────┴──────────────┴────────────────────────┘
```

### How It Works

```
Browser A                    SFU Server                    Browser B
─────────                    ──────────                    ─────────
getUserMedia()          ┌─── mediasoup Router ───┐
    │                   │                        │
    ├── Produce ───────►│   Audio/Video routing   │◄─── Produce ──┤
    │                   │   (No P2P — scales to   │               │
    ◄── Consume ────────│    100+ participants)   │──── Consume ──►
    │                   └────────────────────────┘               │
    │                            │                               │
    └── Socket.io ───── Chat / Hand Raise / Positions ──────────┘
```

---

## 📦 Packages

### `@hivertc/sdk` — Core SDK

Framework-agnostic TypeScript SDK. Zero React dependency.

```bash
npm install @hivertc/sdk socket.io-client mediasoup-client
```

```typescript
import { HiveRTC } from '@hivertc/sdk';

// 1. Create client
const hive = new HiveRTC({ serverUrl: 'http://localhost:3002' });

// 2. Create & join a room
const room = hive.createRoom('standup-daily');
await room.join();

// 3. React to events
room.on('peerJoined', (peer) => {
  console.log(`${peer.id} joined the meeting`);
});

room.on('trackAdded', ({ peerId, track, kind }) => {
  // Attach track to a <video> or <audio> element
  const el = document.createElement(kind);
  el.srcObject = new MediaStream([track]);
  el.autoplay = true;
  document.body.appendChild(el);
});

// 4. Screen share
await room.startScreenShare();

// 5. Send chat
room.sendChat('Hello everyone!');
```

#### SDK Classes

| Class | Purpose |
|-------|---------|
| `HiveRTC` | Entry point — creates rooms |
| `Room` | Full meeting lifecycle (join/leave/produce/consume) |
| `SignalingClient` | Typed Socket.io protocol layer |
| `MediaEngine` | mediasoup-client wrapper for WebRTC transport |
| `SpatialAudioEngine` | HRTF positional audio via Web Audio API |
| `ActiveSpeakerDetector` | Real-time mic volume analysis |
| `NetworkMonitor` | WebRTC stats polling for connection health |

---

### `@hivertc/react` — React Bindings

Pre-built hooks and components for React apps.

```bash
npm install @hivertc/react @hivertc/sdk react react-dom
```

```tsx
import { HiveProvider, useHiveRoom, VideoTile, ControlBar } from '@hivertc/react';

function App() {
  return (
    <HiveProvider config={{ serverUrl: 'http://localhost:3002' }}>
      <Meeting />
    </HiveProvider>
  );
}

function Meeting() {
  const {
    join, leave, toggleMic, toggleCam,
    localStream, remoteStreams, isMicOn, isCamOn,
    chatMessages, sendChat, raisedHands
  } = useHiveRoom('team-standup');

  return (
    <div>
      {/* Video grid */}
      {localStream && <VideoTile stream={localStream} isLocal />}
      {remoteStreams.map(s => (
        <VideoTile key={s.peerId} stream={s.stream} />
      ))}

      {/* Controls */}
      <ControlBar
        isMicOn={isMicOn}
        isCamOn={isCamOn}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onLeave={leave}
      />
    </div>
  );
}
```

---

## 🎧 3D Spatial Audio Demo

The spatial audio demo is a standout feature — it uses **HRTF (Head-Related Transfer Function)** panning via the Web Audio API to create realistic positional audio.

### What It Does

- Users see a **2D interactive map** with draggable avatars
- **Audio volume** decreases as avatars move apart
- **Stereo panning** shifts left/right based on relative position
- Audio is **always audible** (inverse distance model, never drops to zero)

### How to Demo

```bash
# Terminal 1: Start SFU server
cd apps/sfu_comm && pnpm dev

# Terminal 2: Start spatial audio demo
cd apps/sfuclient && pnpm dev
```

1. Open **two browser tabs** at `http://localhost:5173`
2. Join the **same room code** in both
3. Allow microphone + camera
4. **Drag your avatar** on the 2D canvas
5. Listen as audio pans and changes volume based on distance

### Technical Implementation

```
<audio srcObject={remoteStream}>
         │
         ▼
createMediaElementSource()
         │
         ▼
   PannerNode (HRTF)      ◄── updatePeerPosition(x, y)
         │
         ▼
      GainNode
         │
         ▼
   🔊 AudioContext.destination (speakers)
```

---

## 🚀 Quick Start (Run Locally)

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9

### 1. Clone & Install

```bash
git clone https://github.com/TanmayChaurasia24/HiveRTC.git
cd HiveRTC
pnpm install
```

### 2. Start the SFU Server

```bash
cd apps/sfu_comm
pnpm dev
# → Server running on http://localhost:3002
```

### 3. Start the Client

```bash
# Option A: Spatial Audio Demo (recommended for demo)
cd apps/sfuclient
pnpm dev
# → http://localhost:5173

# Option B: Full Metaverse Client
cd apps/frontend
pnpm dev
```

### 4. Test It

Open **two browser tabs**, join the same room, and you'll see each other's video + hear spatial audio.

---

## 📁 Project Structure

```
HiveRTC/
├── apps/
│   ├── sfu_comm/          # mediasoup SFU server (Node.js + Socket.io)
│   ├── sfuclient/         # Standalone meeting client + spatial audio demo
│   ├── frontend/          # 3D metaverse client (Canvas-based)
│   ├── websocket/         # WebSocket server for metaverse state
│   ├── httpserver/        # HTTP API server
│   └── webrtc_node/       # WebRTC utility server
│
├── packages/
│   ├── sdk/               # @hivertc/sdk — Core SDK (publishable)
│   ├── react/             # @hivertc/react — React bindings (publishable)
│   ├── database/          # Prisma database client
│   ├── redis/             # Redis client wrapper
│   ├── ui/                # Shared UI components
│   ├── eslint-config/     # Shared ESLint config
│   └── typescript-config/ # Shared TypeScript config
│
├── turbo.json             # Turborepo pipeline config
├── pnpm-workspace.yaml    # pnpm workspace definition
└── package.json           # Root package.json
```

---

## 🛠️ Development

### Build Everything

```bash
pnpm turbo build
```

### Build Only the SDK

```bash
cd packages/sdk && pnpm build
cd packages/react && pnpm build
```

### Type Check

```bash
pnpm turbo typecheck
```

---

## 📡 SFU Server Events (Wire Protocol)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join_room` | Client → Server | Join a room, get RTP capabilities |
| `createWebRtcTransport` | Client → Server | Create send/recv transport |
| `transport-connect` | Client → Server | DTLS handshake |
| `transport-produce` | Client → Server | Start sending media |
| `consume` | Client → Server | Subscribe to remote producer |
| `consumer-resume` | Client → Server | Unpause a consumer |
| `new-producer` | Server → Client | New remote media available |
| `producer-closed` | Server → Client | Remote producer gone |
| `chat-message` | Bidirectional | In-meeting chat relay |
| `hand-raised` | Bidirectional | Hand raise state relay |
| `position-update` | Bidirectional | Spatial audio position sync |

---

## 🎯 Use Cases

- **Remote Work** — Team standups, 1-on-1s, all-hands meetings
- **Education** — Virtual classrooms with spatial breakout rooms
- **Telehealth** — HIPAA-ready video consultations
- **Gaming** — Proximity voice chat in virtual worlds
- **Events** — Virtual conferences with spatial networking

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/TanmayChaurasia24">Tanmay Chaurasia</a>
</p>
