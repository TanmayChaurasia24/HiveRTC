// ═══════════════════════════════════════════════════════════════
// HiveRTC SDK — Signaling Client
// Typed Socket.io wrapper encoding the SFU wire protocol.
// Every Socket.io event from sfu_comm/socketHandler.ts is
// wrapped as a typed async method.
// ═══════════════════════════════════════════════════════════════

import { io, Socket } from 'socket.io-client';
import { SignalingError, ConnectionError } from './errors.js';
import type {
  TransportParams,
  JoinRoomResponse,
  ConsumeResponse,
  ChatMessage,
} from './types.js';

export class SignalingClient {
  private socket: Socket | null = null;
  private _roomId: string | null = null;
  private debug: boolean;

  constructor(debug = false) {
    this.debug = debug;
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }

  get roomId(): string | null {
    return this._roomId;
  }

  // ── Connection ──

  connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.log('Connecting to', serverUrl);
      this.socket = io(serverUrl, { transports: ['websocket'] });

      const onConnect = () => {
        cleanup();
        this.log('Socket connected, id:', this.socket?.id);
        resolve();
      };

      const onError = (err: Error) => {
        cleanup();
        reject(new ConnectionError(`Failed to connect: ${err.message}`));
      };

      const cleanup = () => {
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
      };

      this.socket.on('connect', onConnect);
      this.socket.on('connect_error', onError);
    });
  }

  disconnect(): void {
    this.log('Disconnecting');
    this.socket?.disconnect();
    this.socket = null;
    this._roomId = null;
  }

  // ── Room ──

  joinRoom(roomId: string, userId?: string): Promise<JoinRoomResponse> {
    this._roomId = roomId;
    return this.emitWithAck('join_room', { roomId, userId });
  }

  // ── Transports ──

  createTransport(): Promise<TransportParams> {
    return new Promise((resolve, reject) => {
      this.requireSocket().emit(
        'createWebRtcTransport',
        {},
        (response: any) => {
          if (response.error)
            return reject(new SignalingError(response.error));
          resolve(response.params);
        },
      );
    });
  }

  connectTransport(
    transportId: string,
    dtlsParameters: any,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.requireSocket().emit(
        'transport-connect',
        { transportId, dtlsParameters },
        (response: any) => {
          if (response?.error)
            return reject(new SignalingError(response.error));
          resolve();
        },
      );
    });
  }

  // ── Produce / Consume ──

  produce(params: {
    transportId: string;
    kind: string;
    rtpParameters: any;
    appData?: any;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      this.requireSocket().emit('produce', params, (response: any) => {
        if (response.error) return reject(new SignalingError(response.error));
        resolve(response.id);
      });
    });
  }

  consume(params: {
    rtpCapabilities: any;
    remoteProducerId: string;
    transportId: string;
  }): Promise<ConsumeResponse> {
    return new Promise((resolve, reject) => {
      this.requireSocket().emit('consume', params, (response: any) => {
        if (response.error) return reject(new SignalingError(response.error));
        resolve(response);
      });
    });
  }

  resumeConsumer(consumerId: string): void {
    this.requireSocket().emit('consumer-resume', { consumerId });
  }

  pauseConsumer(consumerId: string): void {
    this.requireSocket().emit('pauseConsumer', { consumerId });
  }

  closeConsumer(consumerId: string): void {
    this.requireSocket().emit('closeConsumer', { consumerId });
  }

  // ── Chat ──

  sendChatMessage(message: {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
  }): void {
    this.requireSocket().emit('chat-message', message);
  }

  // ── Hand Raise ──

  sendHandRaise(data: {
    userId: string;
    raised: boolean;
  }): void {
    this.requireSocket().emit('hand-raised', data);
  }

  // ── Event Listeners ──

  onNewProducer(
    handler: (data: {
      producerId: string;
      socketId: string;
      userId: string;
      kind: string;
    }) => void,
  ): void {
    this.requireSocket().on('new-producer', handler);
  }

  onProducerClosed(
    handler: (data: { remoteProducerId: string }) => void,
  ): void {
    this.requireSocket().on('producer-closed', handler);
  }

  onPeerLeft(handler: (data: { userId: string }) => void): void {
    this.requireSocket().on('peerLeft', handler);
  }

  onChatMessage(handler: (message: ChatMessage) => void): void {
    this.requireSocket().on('chat-message', handler);
  }

  onHandRaised(
    handler: (data: { userId: string; raised: boolean }) => void,
  ): void {
    this.requireSocket().on('hand-raised', handler);
  }

  // ── Private Helpers ──

  private requireSocket(): Socket {
    if (!this.socket) {
      throw new ConnectionError('Not connected — call connect() first');
    }
    return this.socket;
  }

  private emitWithAck<T>(event: string, payload: any): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requireSocket().emit(event, payload, (response: any) => {
        if (response?.error)
          return reject(new SignalingError(response.error));
        resolve(response as T);
      });
    });
  }

  private log(...args: any[]): void {
    if (this.debug) console.log('[HiveRTC:Signaling]', ...args);
  }
}
