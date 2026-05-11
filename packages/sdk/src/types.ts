// ═══════════════════════════════════════════════════════════════
// HiveRTC SDK — Type Definitions
// All public TypeScript interfaces and types for the SDK
// ═══════════════════════════════════════════════════════════════

/** Configuration for initializing the HiveRTC SDK */
export interface HiveRTCConfig {
  /** URL of the HiveRTC SFU server (e.g. 'http://localhost:3002') */
  serverUrl: string;
  /** Custom media constraints for getUserMedia */
  mediaConstraints?: MediaStreamConstraints;
  /** Custom ICE servers for WebRTC */
  iceServers?: RTCIceServer[];
  /** Enable debug logging */
  debug?: boolean;
}

/** Options when joining a room */
export interface JoinRoomOptions {
  /** Your application's user ID (passed to SFU for identity) */
  userId?: string;
  /** Display name shown to other participants */
  displayName?: string;
  /** Automatically publish audio/video on join (default: true) */
  autoPublish?: boolean;
}

/** Information about a remote peer in the room */
export interface PeerInfo {
  peerId: string;
  userId: string;
  displayName?: string;
  streams: Map<string, MediaStream>;
  producerIds: { audio?: string; video?: string; screen?: string };
  isHandRaised: boolean;
}

/** A chat message in the meeting */
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}

/** Network quality assessment */
export interface NetworkQuality {
  /** Quality score: 1=terrible, 5=excellent */
  score: 1 | 2 | 3 | 4 | 5;
  /** Round-trip time in milliseconds */
  rtt: number;
  /** Packet loss percentage */
  packetLoss: number;
  /** Available bandwidth in kbps */
  availableBandwidth: number;
}

/** Connection lifecycle states */
export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'closed';

/** Transport parameters from the SFU */
export interface TransportParams {
  id: string;
  iceParameters: any;
  iceCandidates: any;
  dtlsParameters: any;
}

/** Response from SFU when joining a room */
export interface JoinRoomResponse {
  rtpCapabilities: any;
  existingProducers: Array<{
    producerId: string;
    userId: string;
    kind: string;
  }>;
}

/** Response from SFU when consuming a remote producer */
export interface ConsumeResponse {
  id: string;
  producerId: string;
  kind: 'audio' | 'video';
  rtpParameters: any;
}

/** Events emitted by the Room class */
export interface RoomEvents extends Record<string, (...args: any[]) => void> {
  connectionStateChanged: (state: ConnectionState) => void;
  localStream: (stream: MediaStream) => void;
  peerJoined: (info: {
    peerId: string;
    userId: string;
    stream: MediaStream;
    kind: 'audio' | 'video';
  }) => void;
  peerLeft: (info: { peerId: string; userId: string }) => void;
  peerStreamAdded: (info: {
    peerId: string;
    userId: string;
    stream: MediaStream;
    kind: 'audio' | 'video';
  }) => void;
  peerStreamRemoved: (info: {
    peerId: string;
    producerId: string;
  }) => void;
  screenShareStarted: (info: {
    peerId: string;
    userId: string;
    stream: MediaStream;
  }) => void;
  screenShareStopped: (info: { peerId: string; userId: string }) => void;
  chatMessage: (message: ChatMessage) => void;
  handRaised: (info: {
    peerId: string;
    userId: string;
    raised: boolean;
  }) => void;
  activeSpeaker: (info: {
    peerId: string;
    userId: string;
    volume: number;
  }) => void;
  networkQuality: (quality: NetworkQuality) => void;
  recordingStarted: () => void;
  recordingStopped: (blob: Blob) => void;
  error: (error: Error) => void;
}
