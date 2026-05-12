# @hivertc/react

> **SFU-powered video meetings in React — in under 10 lines of code.**

[![npm version](https://img.shields.io/npm/v/@hivertc/react?color=6366f1&style=flat-square)](https://www.npmjs.com/package/@hivertc/react)
[![license](https://img.shields.io/npm/l/@hivertc/react?color=22c55e&style=flat-square)](./LICENSE)
[![React](https://img.shields.io/badge/React-18%20%7C%2019-61dafb?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)

React bindings for the [HiveRTC SDK](../sdk/README.md) — hooks, context, and pre-built components for building video conferencing UIs on top of HiveRTC's SFU-powered infrastructure.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [`<HiveProvider>`](#hiveprovider)
  - [`useHiveRoom()`](#usehiveroom)
  - [`useHiveConfig()`](#usehiveconfig)
  - [`<VideoTile>`](#videotile)
  - [`<ControlBar>`](#controlbar)
- [Types](#types)
- [Advanced Usage](#advanced-usage)
- [Requirements](#requirements)

---

## Features

- 🎣 **`useHiveRoom`** — a single hook for joining rooms, managing streams, chat, hand raise, recording, and more
- 🏗️ **`<HiveProvider>`** — React context that propagates your server config through the component tree
- 🎞️ **`<VideoTile>`** — zero-setup `<video>` component with automatic stream lifecycle management
- 🎛️ **`<ControlBar>`** — pre-built, styled meeting controls (mic, camera, screen share, recording, hand raise, leave)
- 🔒 **Fully typed** — complete TypeScript definitions for every hook, component, and event
- ⚡ **Stable callbacks** — all actions are memoized with `useCallback` to prevent unnecessary re-renders
- 🧹 **Automatic cleanup** — media tracks and SFU connections are torn down when components unmount

---

## Installation

```bash
# npm
npm install @hivertc/react @hivertc/sdk

# pnpm
pnpm add @hivertc/react @hivertc/sdk
```

### Peer Dependencies

```bash
npm install react socket.io-client mediasoup-client
```

| Peer Dependency     | Required Version    |
|---------------------|---------------------|
| `react`             | `^18.0.0 \| ^19.0.0` |
| `socket.io-client`  | `^4.0.0`            |
| `mediasoup-client`  | `^3.0.0`            |

---

## Quick Start

Wrap your app in `<HiveProvider>`, then use `useHiveRoom` inside any child component to join and control a room.

```tsx
// App.tsx
import { HiveProvider } from '@hivertc/react';
import { MeetingRoom } from './MeetingRoom';

export default function App() {
  return (
    <HiveProvider config={{ serverUrl: 'https://your-hivertc-server.com' }}>
      <MeetingRoom />
    </HiveProvider>
  );
}
```

```tsx
// MeetingRoom.tsx
import { useHiveConfig, useHiveRoom, VideoTile, ControlBar } from '@hivertc/react';

export function MeetingRoom() {
  const config = useHiveConfig();
  const {
    joinRoom,
    leaveRoom,
    toggleMic, toggleCam,
    shareScreen, stopScreenShare,
    startRecording, stopRecording,
    raiseHand, lowerHand,
    localStream,
    remoteStreams,
    joined,
    isMicOn, isCamOn,
    isScreenSharing,
    isRecording,
    isHandRaised,
  } = useHiveRoom(config);

  return (
    <div>
      {!joined ? (
        <button onClick={() => joinRoom('my-room-id', { userId: 'alice', displayName: 'Alice' })}>
          Join Room
        </button>
      ) : (
        <>
          {/* Local preview */}
          {localStream && (
            <VideoTile stream={localStream} muted mirror label="You" />
          )}

          {/* Remote peers */}
          {remoteStreams.map((rs) => (
            <VideoTile key={`${rs.peerId}-${rs.kind}`} stream={rs.stream} label={rs.userId} />
          ))}

          {/* Meeting controls */}
          <ControlBar
            isMicOn={isMicOn}
            isCamOn={isCamOn}
            isScreenSharing={isScreenSharing}
            isRecording={isRecording}
            isHandRaised={isHandRaised}
            onToggleMic={toggleMic}
            onToggleCam={toggleCam}
            onShareScreen={shareScreen}
            onStopScreenShare={stopScreenShare}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onRaiseHand={raiseHand}
            onLowerHand={lowerHand}
            onLeave={leaveRoom}
          />
        </>
      )}
    </div>
  );
}
```

---

## API Reference

### `<HiveProvider>`

Wraps your application and provides HiveRTC configuration to the entire component tree via React context.

```tsx
import { HiveProvider } from '@hivertc/react';

<HiveProvider config={config}>
  {children}
</HiveProvider>
```

#### Props

| Prop     | Type            | Required | Description                          |
|----------|-----------------|----------|--------------------------------------|
| `config` | `HiveRTCConfig` | ✅        | SFU server configuration             |
| `children` | `ReactNode`   | ✅        | Child components                     |

#### `HiveRTCConfig`

| Field               | Type                       | Default | Description                                      |
|---------------------|----------------------------|---------|--------------------------------------------------|
| `serverUrl`         | `string`                   | —       | URL of your HiveRTC SFU server                   |
| `mediaConstraints`  | `MediaStreamConstraints`   | —       | Custom `getUserMedia` constraints                |
| `iceServers`        | `RTCIceServer[]`           | —       | Custom STUN/TURN servers                         |
| `debug`             | `boolean`                  | `false` | Enable verbose SDK logging                       |

---

### `useHiveRoom()`

The primary hook — manages everything needed for a video meeting. Accepts a `HiveRTCConfig` and returns reactive state and stable action callbacks.

```ts
const {
  // Actions
  joinRoom, leaveRoom,
  toggleMic, toggleCam,
  shareScreen, stopScreenShare,
  sendMessage,
  raiseHand, lowerHand,
  startRecording, stopRecording,

  // State
  localStream,
  remoteStreams,
  peers,
  chatMessages,
  connectionState,
  joined,
  isMicOn,
  isCamOn,
  isScreenSharing,
  isRecording,
  isHandRaised,
  activeSpeaker,
  networkQuality,
  room,            // raw Room instance for advanced use
} = useHiveRoom(config);
```

#### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `joinRoom` | `(roomId: string, options?: JoinRoomOptions) => Promise<void>` | Join or create a room |
| `leaveRoom` | `() => void` | Leave and reset all state |
| `toggleMic` | `() => void` | Toggle microphone on/off |
| `toggleCam` | `() => void` | Toggle camera on/off |
| `shareScreen` | `() => Promise<void>` | Start screen sharing |
| `stopScreenShare` | `() => void` | Stop screen sharing |
| `sendMessage` | `(content: string) => void` | Send a chat message |
| `raiseHand` | `() => void` | Raise your hand |
| `lowerHand` | `() => void` | Lower your hand |
| `startRecording` | `() => void` | Start local recording |
| `stopRecording` | `() => Promise<Blob>` | Stop recording and get the `Blob` |

#### `JoinRoomOptions`

| Field         | Type      | Default | Description                             |
|---------------|-----------|---------|-----------------------------------------|
| `userId`      | `string`  | —       | Your app's user ID                      |
| `displayName` | `string`  | —       | Display name shown to other participants |
| `autoPublish` | `boolean` | `true`  | Auto-publish audio/video on join        |

#### State

| Property          | Type                          | Description                              |
|-------------------|-------------------------------|------------------------------------------|
| `localStream`     | `MediaStream \| null`         | Your local camera/mic stream             |
| `remoteStreams`   | `RemoteStream[]`              | All remote peer streams                  |
| `peers`           | `Map<string, PeerInfo>`       | All participants in the room             |
| `chatMessages`    | `ChatMessage[]`               | All received chat messages               |
| `connectionState` | `ConnectionState`             | Current connection lifecycle state       |
| `joined`          | `boolean`                     | Whether you have successfully joined     |
| `isMicOn`         | `boolean`                     | Microphone active                        |
| `isCamOn`         | `boolean`                     | Camera active                            |
| `isScreenSharing` | `boolean`                     | Screen share active                      |
| `isRecording`     | `boolean`                     | Recording in progress                    |
| `isHandRaised`    | `boolean`                     | Your hand is raised                      |
| `activeSpeaker`   | `string \| null`              | `userId` of the currently active speaker |
| `networkQuality`  | `NetworkQuality \| null`      | Real-time network quality metrics        |
| `room`            | `Room \| null`                | Raw `Room` instance for advanced usage   |

#### `ConnectionState` Values

| Value          | Meaning                                       |
|----------------|-----------------------------------------------|
| `'idle'`       | Not connected                                 |
| `'connecting'` | Establishing SFU connection                   |
| `'connected'`  | Fully connected and media is flowing          |
| `'reconnecting'` | Attempting to recover a dropped connection  |
| `'error'`      | An unrecoverable error occurred               |
| `'closed'`     | Connection closed cleanly                     |

---

### `useHiveConfig()`

Retrieves the `HiveRTCConfig` provided by the nearest `<HiveProvider>`. Throws if used outside a provider.

```ts
import { useHiveConfig } from '@hivertc/react';

const config = useHiveConfig();
// config.serverUrl, config.debug, etc.
```

---

### `<VideoTile>`

A zero-config video tile component that automatically attaches a `MediaStream` to a `<video>` element, handles `srcObject` lifecycle, and optionally overlays a name label.

```tsx
import { VideoTile } from '@hivertc/react';

// Local preview (muted to avoid echo, mirrored for selfie view)
<VideoTile stream={localStream} muted mirror label="You" />

// Remote peer
<VideoTile stream={rs.stream} label={rs.userId} />
```

#### Props

| Prop        | Type                   | Default  | Description                              |
|-------------|------------------------|----------|------------------------------------------|
| `stream`    | `MediaStream`          | —        | The stream to render (required)          |
| `muted`     | `boolean`              | `false`  | Mute audio output (use `true` for local) |
| `mirror`    | `boolean`              | `false`  | Horizontally flip (selfie effect)        |
| `label`     | `string`               | —        | Name overlay text                        |
| `showLabel` | `boolean`              | `true`   | Show or hide the label overlay           |
| `className` | `string`               | `''`     | CSS class for the container `<div>`      |
| `style`     | `React.CSSProperties`  | —        | Inline styles for the container          |

---

### `<ControlBar>`

A pre-built, glassmorphism-styled meeting control bar. Includes mic, camera, screen share, recording, hand raise, and leave buttons. Uses inline styles with zero external CSS dependencies.

```tsx
import { ControlBar } from '@hivertc/react';

<ControlBar
  isMicOn={isMicOn}
  isCamOn={isCamOn}
  isScreenSharing={isScreenSharing}
  isRecording={isRecording}
  isHandRaised={isHandRaised}
  onToggleMic={toggleMic}
  onToggleCam={toggleCam}
  onShareScreen={shareScreen}
  onStopScreenShare={stopScreenShare}
  onStartRecording={startRecording}
  onStopRecording={stopRecording}
  onRaiseHand={raiseHand}
  onLowerHand={lowerHand}
  onLeave={leaveRoom}
/>
```

#### Props

| Prop                | Type         | Description                             |
|---------------------|--------------|-----------------------------------------|
| `isMicOn`           | `boolean`    | Microphone state                        |
| `isCamOn`           | `boolean`    | Camera state                            |
| `isScreenSharing`   | `boolean`    | Screen share active state               |
| `isRecording`       | `boolean`    | Recording active state                  |
| `isHandRaised`      | `boolean`    | Hand raised state                       |
| `onToggleMic`       | `() => void` | Callback to toggle microphone           |
| `onToggleCam`       | `() => void` | Callback to toggle camera               |
| `onShareScreen`     | `() => void` | Callback to start screen sharing        |
| `onStopScreenShare` | `() => void` | Callback to stop screen sharing         |
| `onStartRecording`  | `() => void` | Callback to start recording             |
| `onStopRecording`   | `() => void` | Callback to stop recording              |
| `onRaiseHand`       | `() => void` | Callback to raise hand                  |
| `onLowerHand`       | `() => void` | Callback to lower hand                  |
| `onLeave`           | `() => void` | Callback to leave the meeting           |
| `className`         | `string`     | Optional CSS class for the bar element  |

---

## Types

All core types are re-exported from `@hivertc/react` for convenience — you do not need to install `@hivertc/sdk` separately in your app just to use types.

```ts
import type {
  HiveRTCConfig,
  JoinRoomOptions,
  PeerInfo,
  ChatMessage,
  NetworkQuality,
  ConnectionState,
  RemoteStream,
  UseHiveRoomReturn,
  VideoTileProps,
  ControlBarProps,
} from '@hivertc/react';
```

### `RemoteStream`

```ts
interface RemoteStream {
  peerId: string;
  userId: string;
  kind: 'audio' | 'video';
  stream: MediaStream;
}
```

### `NetworkQuality`

```ts
interface NetworkQuality {
  score: 1 | 2 | 3 | 4 | 5; // 1 = terrible, 5 = excellent
  rtt: number;               // round-trip time in ms
  packetLoss: number;        // packet loss percentage
  availableBandwidth: number; // kbps
}
```

### `ChatMessage`

```ts
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}
```

---

## Advanced Usage

### Accessing the Raw `Room` Instance

If you need to call lower-level SDK methods not exposed by the hook, use the `room` property:

```ts
const { room } = useHiveRoom(config);

// Access any Room method directly
room?.someAdvancedMethod();
```

### Building a Custom Control Bar

You can wire any UI to the hook's callbacks — `<ControlBar>` is just a convenience:

```tsx
const { toggleMic, isMicOn } = useHiveRoom(config);

<button onClick={toggleMic} style={{ color: isMicOn ? 'green' : 'red' }}>
  {isMicOn ? 'Mute' : 'Unmute'}
</button>
```

### Chat

```tsx
const { sendMessage, chatMessages } = useHiveRoom(config);

// Send a message
sendMessage('Hello everyone!');

// Render messages
chatMessages.map((msg) => (
  <div key={msg.id}>
    <strong>{msg.senderName}:</strong> {msg.content}
  </div>
));
```

### Network Quality Indicator

```tsx
const { networkQuality } = useHiveRoom(config);

const qualityLabel = {
  1: '🔴 Poor',
  2: '🟠 Fair',
  3: '🟡 Good',
  4: '🟢 Great',
  5: '🟢 Excellent',
};

{networkQuality && (
  <span>{qualityLabel[networkQuality.score]} ({networkQuality.rtt}ms)</span>
)}
```

### Recording

```tsx
const { startRecording, stopRecording, isRecording } = useHiveRoom(config);

async function handleStopRecording() {
  const blob = await stopRecording();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'meeting-recording.webm';
  a.click();
}
```

---

## Requirements

| Requirement       | Version       |
|-------------------|---------------|
| React             | 18 or 19      |
| TypeScript        | 5.x           |
| `@hivertc/sdk`    | Same version  |
| `socket.io-client`| ^4.0.0        |
| `mediasoup-client`| ^3.0.0        |
| Browser           | Chrome 90+, Firefox 90+, Edge 90+, Safari 15.4+ |

---

## License

MIT © [Tanmay Chaurasia](https://github.com/TanmayChaurasia24)

---

> Built on top of [HiveRTC SDK](../sdk/README.md) — the SFU-powered real-time communication engine.
