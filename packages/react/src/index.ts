// ═══════════════════════════════════════════════════════════════
// @hivertc/react — Public API Exports
// ═══════════════════════════════════════════════════════════════

// Hooks
export { useHiveRoom } from './useHiveRoom.js';
export type { RemoteStream, UseHiveRoomReturn } from './useHiveRoom.js';

// Context
export { HiveProvider, useHiveConfig } from './HiveProvider.js';

// Pre-built Components
export { VideoTile } from './components/VideoTile.js';
export type { VideoTileProps } from './components/VideoTile.js';

export { ControlBar } from './components/ControlBar.js';
export type { ControlBarProps } from './components/ControlBar.js';

// Re-export core types for convenience
export type {
  HiveRTCConfig,
  JoinRoomOptions,
  PeerInfo,
  ChatMessage,
  NetworkQuality,
  ConnectionState,
} from '@hivertc/sdk';
