# @hivertc/sdk

> 🐝 **HiveRTC SDK** — Create Zoom-like meeting rooms with SFU-based WebRTC.
> One `npm install` to add real-time video conferencing to any web app.

## Features

- 📹 **Video & Audio** — HD video calls powered by Mediasoup SFU
- 🖥️ **Screen Sharing** — Present slides, share code, demo apps
- 💬 **In-Meeting Chat** — Real-time text messaging alongside video
- 🎙️ **Active Speaker Detection** — Auto-detect who's talking
- ✋ **Hand Raise & Reactions** — Engagement for classrooms and town halls
- ⏺️ **Meeting Recording** — Client-side recording with MediaRecorder API
- 📊 **Network Quality Monitor** — Live RTT, packet loss, and quality score
- 🔌 **Framework Agnostic** — Works with React, Vue, Svelte, vanilla JS
- ⚛️ **React Bindings** — `@hivertc/react` with hooks and pre-built components

## Quick Start

### Installation

```bash
npm install @hivertc/sdk socket.io-client mediasoup-client
```

### Vanilla JavaScript / TypeScript

```typescript
import { HiveRTC } from '@hivertc/sdk';

const hive = new HiveRTC({
  serverUrl: 'http://localhost:3002',
  debug: true,
});

// Join a room
const room = await hive.joinRoom('daily-standup', {
  userId: 'user-123',
  displayName: 'Tanmay',
});

// Get your local stream
room.on('localStream', (stream) => {
  document.querySelector('video#local').srcObject = stream;
});

// Handle remote peers
room.on('peerJoined', ({ userId, stream, kind }) => {
  if (kind === 'video') {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    document.getElementById('peers').appendChild(video);
  }
});

room.on('peerLeft', ({ userId }) => {
  console.log(`${userId} left the meeting`);
});

// Controls
room.toggleMic();
room.toggleCam();
await room.shareScreen();
room.sendMessage('Hello everyone!');
room.raiseHand();
room.startRecording();
room.leave();
```

### React

```bash
npm install @hivertc/react
```

```tsx
import { useHiveRoom, VideoTile, ControlBar } from '@hivertc/react';

function MeetingRoom() {
  const {
    joinRoom, leaveRoom, toggleMic, toggleCam,
    shareScreen, stopScreenShare, sendMessage,
    raiseHand, lowerHand, startRecording, stopRecording,
    localStream, remoteStreams, chatMessages,
    isMicOn, isCamOn, isScreenSharing, isRecording, isHandRaised,
    activeSpeaker, networkQuality, connectionState, joined,
  } = useHiveRoom({ serverUrl: 'http://localhost:3002' });

  return (
    <div>
      {!joined ? (
        <button onClick={() => joinRoom('my-room', { userId: 'user-1' })}>
          Join Meeting
        </button>
      ) : (
        <>
          {localStream && <VideoTile stream={localStream} muted mirror label="You" />}

          {remoteStreams
            .filter(s => s.kind === 'video')
            .map(s => (
              <VideoTile key={s.peerId} stream={s.stream} label={s.userId} />
            ))}

          <ControlBar
            isMicOn={isMicOn} isCamOn={isCamOn}
            isScreenSharing={isScreenSharing} isRecording={isRecording}
            isHandRaised={isHandRaised}
            onToggleMic={toggleMic} onToggleCam={toggleCam}
            onShareScreen={shareScreen} onStopScreenShare={stopScreenShare}
            onStartRecording={startRecording} onStopRecording={stopRecording}
            onRaiseHand={raiseHand} onLowerHand={lowerHand}
            onLeave={leaveRoom}
          />
        </>
      )}
    </div>
  );
}
```

## API Reference

### `HiveRTC`

| Method | Description |
|--------|-------------|
| `new HiveRTC(config)` | Create SDK instance |
| `joinRoom(roomId, options?)` | Join a room → returns `Room` |
| `getRoom(roomId)` | Get an existing room |
| `destroy()` | Leave all rooms |

### `Room`

| Method | Description |
|--------|-------------|
| `join(options?)` | Connect and publish media |
| `leave()` | Full cleanup |
| `toggleMic()` | Toggle microphone |
| `toggleCam()` | Toggle camera |
| `shareScreen()` | Start screen sharing |
| `stopScreenShare()` | Stop screen sharing |
| `sendMessage(text)` | Send chat message |
| `raiseHand()` / `lowerHand()` | Toggle hand raise |
| `startRecording()` | Start client-side recording |
| `stopRecording()` | Stop recording → Blob |

### Room Events

| Event | Payload | When |
|-------|---------|------|
| `localStream` | `MediaStream` | Your media is ready |
| `peerJoined` | `{ peerId, userId, stream, kind }` | New participant |
| `peerLeft` | `{ peerId, userId }` | Participant left |
| `chatMessage` | `ChatMessage` | New chat message |
| `handRaised` | `{ peerId, userId, raised }` | Hand raise toggled |
| `activeSpeaker` | `{ peerId, userId, volume }` | Speaker changed |
| `networkQuality` | `NetworkQuality` | Connection quality update |
| `screenShareStarted` | `{ peerId, userId, stream }` | Screen share began |
| `screenShareStopped` | `{ peerId, userId }` | Screen share ended |
| `recordingStopped` | `Blob` | Recording file ready |

## Architecture

```
┌─────────────────────┐
│   Your Application  │
│  (React/Vue/Vanilla) │
└──────────┬──────────┘
           │ npm install @hivertc/sdk
┌──────────▼──────────┐
│   @hivertc/sdk      │
│  ┌───────────────┐  │
│  │  HiveRTC      │  │
│  │  └─ Room      │  │
│  │     ├─ Signal  │  │ ← Socket.io to SFU
│  │     ├─ Media   │  │ ← mediasoup-client
│  │     ├─ Chat    │  │
│  │     ├─ Screen  │  │
│  │     ├─ Record  │  │
│  │     └─ Speaker │  │
│  └───────────────┘  │
└──────────┬──────────┘
           │ WebRTC + Socket.io
┌──────────▼──────────┐
│  HiveRTC SFU Server │
│  (Mediasoup + Redis) │
└─────────────────────┘
```

## License

MIT
