// ═══════════════════════════════════════════════════════════════
// HiveRTC SDK — Public API Exports
// Everything that consumers of @hivertc/sdk can import.
// ═══════════════════════════════════════════════════════════════

// Core classes
export { HiveRTC } from './HiveRTC.js';
export { Room } from './Room.js';

// Internal modules (for advanced usage)
export { SignalingClient } from './SignalingClient.js';
export { MediaEngine } from './MediaEngine.js';
export { ActiveSpeakerDetector } from './ActiveSpeaker.js';
export { NetworkMonitor } from './NetworkMonitor.js';
export { SpatialAudioEngine } from './SpatialAudio.js';
export type { SpatialAudioOptions } from './SpatialAudio.js';

// Utilities
export { TypedEventEmitter } from './EventEmitter.js';

// Errors
export {
  HiveRTCError,
  ConnectionError,
  MediaError,
  SignalingError,
  TransportError,
  RoomError,
} from './errors.js';

// Types
export type {
  HiveRTCConfig,
  JoinRoomOptions,
  PeerInfo,
  ChatMessage,
  NetworkQuality,
  ConnectionState,
  TransportParams,
  JoinRoomResponse,
  ConsumeResponse,
  RoomEvents,
} from './types.js';
