// ═══════════════════════════════════════════════════════════════
// HiveRTC SDK — Custom Error Classes
// ═══════════════════════════════════════════════════════════════

export class HiveRTCError extends Error {
  public code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'HiveRTCError';
    this.code = code;
  }
}

export class ConnectionError extends HiveRTCError {
  constructor(message: string) {
    super('CONNECTION_ERROR', message);
    this.name = 'ConnectionError';
  }
}

export class MediaError extends HiveRTCError {
  constructor(message: string) {
    super('MEDIA_ERROR', message);
    this.name = 'MediaError';
  }
}

export class SignalingError extends HiveRTCError {
  constructor(message: string) {
    super('SIGNALING_ERROR', message);
    this.name = 'SignalingError';
  }
}

export class TransportError extends HiveRTCError {
  constructor(message: string) {
    super('TRANSPORT_ERROR', message);
    this.name = 'TransportError';
  }
}

export class RoomError extends HiveRTCError {
  constructor(message: string) {
    super('ROOM_ERROR', message);
    this.name = 'RoomError';
  }
}
