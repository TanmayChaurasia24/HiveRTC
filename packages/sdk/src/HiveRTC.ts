// ═══════════════════════════════════════════════════════════════
// HiveRTC SDK — Main Entry Point
// The user-facing HiveRTC class. Holds configuration and
// creates Room instances.
// ═══════════════════════════════════════════════════════════════

import { Room } from './Room.js';
import type { HiveRTCConfig, JoinRoomOptions } from './types.js';

export class HiveRTC {
  private config: HiveRTCConfig;
  private rooms = new Map<string, Room>();

  constructor(config: HiveRTCConfig) {
    this.config = config;
    this.log('HiveRTC initialized with server:', config.serverUrl);
  }

  /**
   * Create and join a meeting room.
   *
   * @example
   * ```typescript
   * const hive = new HiveRTC({ serverUrl: 'http://localhost:3002' });
   * const room = await hive.joinRoom('daily-standup', {
   *   userId: 'user-123',
   *   displayName: 'Tanmay',
   * });
   *
   * room.on('peerJoined', ({ userId, stream }) => {
   *   // Render remote video
   * });
   * ```
   */
  async joinRoom(
    roomId: string,
    options: JoinRoomOptions = {},
  ): Promise<Room> {
    if (this.rooms.has(roomId)) {
      throw new Error(`Already in room: ${roomId}`);
    }

    const room = new Room(roomId, this.config);
    this.rooms.set(roomId, room);

    // Auto-cleanup when room is left
    room.on('connectionStateChanged', (state) => {
      if (state === 'closed') {
        this.rooms.delete(roomId);
      }
    });

    await room.join(options);
    return room;
  }

  /**
   * Get an existing room instance by ID.
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get all active rooms.
   */
  getActiveRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Leave all rooms and cleanup.
   */
  destroy(): void {
    this.rooms.forEach((room) => room.leave());
    this.rooms.clear();
    this.log('HiveRTC destroyed');
  }

  private log(...args: any[]): void {
    if (this.config.debug) console.log('[HiveRTC]', ...args);
  }
}
