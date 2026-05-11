// ═══════════════════════════════════════════════════════════════
// HiveRTC SDK — Room
// The core orchestrator. Manages the full lifecycle of a
// meeting room: join, media, peers, chat, screen share,
// recording, hand raise, active speaker, network quality.
//
// This is the primary API surface of the SDK.
// ═══════════════════════════════════════════════════════════════

import { TypedEventEmitter } from './EventEmitter.js';
import { SignalingClient } from './SignalingClient.js';
import { MediaEngine } from './MediaEngine.js';
import { ActiveSpeakerDetector } from './ActiveSpeaker.js';
import { NetworkMonitor } from './NetworkMonitor.js';
import { RoomError, MediaError } from './errors.js';
import type {
  HiveRTCConfig,
  JoinRoomOptions,
  RoomEvents,
  ConnectionState,
  PeerInfo,
  ChatMessage,
} from './types.js';

export class Room extends TypedEventEmitter<RoomEvents> {
  readonly roomId: string;
  private config: HiveRTCConfig;
  private signaling: SignalingClient;
  private media: MediaEngine;
  private activeSpeaker: ActiveSpeakerDetector;
  private networkMonitor: NetworkMonitor;

  // ── State ──
  private _connectionState: ConnectionState = 'idle';
  private _localStream: MediaStream | null = null;
  private _screenStream: MediaStream | null = null;
  private _peers = new Map<string, PeerInfo>();
  private _isMicOn = true;
  private _isCamOn = true;
  private _isScreenSharing = false;
  private _isRecording = false;
  private _chatMessages: ChatMessage[] = [];
  private _isHandRaised = false;
  private _userId: string | null = null;
  private _displayName: string | null = null;

  // Recording
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  constructor(roomId: string, config: HiveRTCConfig) {
    super();
    this.roomId = roomId;
    this.config = config;
    this.signaling = new SignalingClient(config.debug);
    this.media = new MediaEngine(this.signaling, config.debug);
    this.activeSpeaker = new ActiveSpeakerDetector();
    this.networkMonitor = new NetworkMonitor();
  }

  // ═══════════════ Public Getters ═══════════════

  get connectionState(): ConnectionState {
    return this._connectionState;
  }
  get localStream(): MediaStream | null {
    return this._localStream;
  }
  get screenStream(): MediaStream | null {
    return this._screenStream;
  }
  get peers(): Map<string, PeerInfo> {
    return this._peers;
  }
  get isMicOn(): boolean {
    return this._isMicOn;
  }
  get isCamOn(): boolean {
    return this._isCamOn;
  }
  get isScreenSharing(): boolean {
    return this._isScreenSharing;
  }
  get isRecording(): boolean {
    return this._isRecording;
  }
  get chatMessages(): ChatMessage[] {
    return this._chatMessages;
  }
  get isHandRaised(): boolean {
    return this._isHandRaised;
  }
  get userId(): string | null {
    return this._userId;
  }

  // ═══════════════ Room Lifecycle ═══════════════

  /**
   * Join the room — connects signaling, sets up media, starts producing.
   */
  async join(options: JoinRoomOptions = {}): Promise<void> {
    if (this._connectionState !== 'idle') {
      throw new RoomError('Already connected or connecting');
    }

    this._userId = options.userId || `user-${Date.now()}`;
    this._displayName = options.displayName || this._userId;
    const autoPublish = options.autoPublish !== false;

    this.setConnectionState('connecting');

    try {
      // 1. Resolve SFU server URL via /join-room endpoint
      const serverUrl = await this.resolveServerUrl();

      // 2. Connect Socket.io
      await this.signaling.connect(serverUrl);

      // 3. Join SFU room
      const { rtpCapabilities, existingProducers } =
        await this.signaling.joinRoom(this.roomId, this._userId);

      // 4. Load mediasoup Device
      await this.media.loadDevice(rtpCapabilities);

      // 5. Create send + recv transports
      const sendTransport = await this.media.createSendTransport();
      await this.media.createRecvTransport();

      // 6. Publish local media (if autoPublish)
      if (autoPublish) {
        await this.publishLocalMedia();
      }

      // 7. Consume existing producers
      if (existingProducers?.length) {
        for (const p of existingProducers) {
          await this.consumeProducer(
            p.producerId,
            p.userId,
            p.kind as 'audio' | 'video',
          );
        }
      }

      // 8. Wire up signaling events
      this.setupSignalingListeners();

      // 9. Start active speaker detection
      this.activeSpeaker.start((info) => {
        this.emit('activeSpeaker', info);
      });

      // 10. Start network quality monitoring
      this.networkMonitor.start(sendTransport, (quality) => {
        this.emit('networkQuality', quality);
      });

      this.setConnectionState('connected');
      this.log('Joined room:', this.roomId);
    } catch (err: any) {
      this.setConnectionState('error');
      this.emit('error', err instanceof Error ? err : new Error(err));
      throw err;
    }
  }

  /**
   * Leave the room — full cleanup.
   */
  leave(): void {
    this.log('Leaving room:', this.roomId);

    // Stop recording if active
    if (this._isRecording) {
      this.stopRecording();
    }

    // Stop screen share
    if (this._isScreenSharing) {
      this.stopScreenShare();
    }

    // Stop active speaker detection
    this.activeSpeaker.stop();

    // Stop network monitoring
    this.networkMonitor.stop();

    // Close all media
    this.media.closeAll();

    // Stop local tracks
    this._localStream?.getTracks().forEach((t) => t.stop());
    this._localStream = null;

    // Disconnect signaling
    this.signaling.disconnect();

    // Clear state
    this._peers.clear();
    this._chatMessages = [];
    this._isHandRaised = false;

    this.setConnectionState('closed');
    this.removeAllListeners();
  }

  // ═══════════════ Media Controls ═══════════════

  /**
   * Toggle microphone on/off.
   */
  toggleMic(): void {
    const producer = this.media.getProducer('audio');

    if (this._isMicOn) {
      this.media.pauseProducer('audio');
      if (this._localStream) {
        const track = this._localStream.getAudioTracks()[0];
        if (track) track.enabled = false;
      }
    } else {
      this.media.resumeProducer('audio');
      if (this._localStream) {
        const track = this._localStream.getAudioTracks()[0];
        if (track) track.enabled = true;
      }
    }

    this._isMicOn = !this._isMicOn;
  }

  /**
   * Toggle camera on/off.
   */
  toggleCam(): void {
    if (this._isCamOn) {
      this.media.pauseProducer('video');
      if (this._localStream) {
        const track = this._localStream.getVideoTracks()[0];
        if (track) track.enabled = false;
      }
    } else {
      this.media.resumeProducer('video');
      if (this._localStream) {
        const track = this._localStream.getVideoTracks()[0];
        if (track) track.enabled = true;
      }
    }

    this._isCamOn = !this._isCamOn;
  }

  // ═══════════════ Screen Sharing ═══════════════

  /**
   * Start sharing your screen. Produces a separate video track.
   */
  async shareScreen(): Promise<MediaStream> {
    if (this._isScreenSharing) {
      throw new RoomError('Already sharing screen');
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      this._screenStream = stream;
      this._isScreenSharing = true;

      const screenTrack = stream.getVideoTracks()[0]!;

      // Produce screen track with appData marker
      await this.media.produce(screenTrack, { type: 'screen' });

      // Handle user stopping share via browser UI
      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      this.emit('screenShareStarted', {
        peerId: this.signaling.socketId || '',
        userId: this._userId || '',
        stream,
      });

      this.log('Screen sharing started');
      return stream;
    } catch (err: any) {
      this._isScreenSharing = false;
      throw new MediaError(`Screen share failed: ${err.message}`);
    }
  }

  /**
   * Stop sharing your screen.
   */
  stopScreenShare(): void {
    if (!this._isScreenSharing) return;

    this._screenStream?.getTracks().forEach((t) => t.stop());
    this.media.closeProducer('screen');
    this._screenStream = null;
    this._isScreenSharing = false;

    this.emit('screenShareStopped', {
      peerId: this.signaling.socketId || '',
      userId: this._userId || '',
    });

    this.log('Screen sharing stopped');
  }

  // ═══════════════ Chat ═══════════════

  /**
   * Send a text message to the room.
   */
  sendMessage(content: string): void {
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderId: this._userId || '',
      senderName: this._displayName || '',
      content,
      timestamp: Date.now(),
    };

    this._chatMessages.push(message);
    this.signaling.sendChatMessage(message);

    // Also emit locally so the sender sees their own message
    this.emit('chatMessage', message);
  }

  // ═══════════════ Hand Raise ═══════════════

  /**
   * Raise your hand.
   */
  raiseHand(): void {
    this._isHandRaised = true;
    this.signaling.sendHandRaise({
      userId: this._userId || '',
      raised: true,
    });
    this.emit('handRaised', {
      peerId: this.signaling.socketId || '',
      userId: this._userId || '',
      raised: true,
    });
  }

  /**
   * Lower your hand.
   */
  lowerHand(): void {
    this._isHandRaised = false;
    this.signaling.sendHandRaise({
      userId: this._userId || '',
      raised: false,
    });
    this.emit('handRaised', {
      peerId: this.signaling.socketId || '',
      userId: this._userId || '',
      raised: false,
    });
  }

  // ═══════════════ Recording ═══════════════

  /**
   * Start recording the meeting (client-side).
   * Records all audio + video into a single Blob.
   */
  startRecording(): void {
    if (this._isRecording) return;

    // Combine all active streams into one
    const tracks: MediaStreamTrack[] = [];

    // Local video + audio
    if (this._localStream) {
      this._localStream.getTracks().forEach((t) => tracks.push(t));
    }

    // Remote audio/video tracks
    this._peers.forEach((peer) => {
      peer.streams.forEach((stream) => {
        stream.getTracks().forEach((t) => tracks.push(t));
      });
    });

    if (tracks.length === 0) {
      throw new MediaError('No media tracks available to record');
    }

    const combinedStream = new MediaStream(tracks);
    this.recordedChunks = [];

    this.mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: this.getSupportedMimeType(),
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, {
        type: this.getSupportedMimeType(),
      });
      this._isRecording = false;
      this.emit('recordingStopped', blob);
    };

    this.mediaRecorder.start(1000); // Collect data every 1s
    this._isRecording = true;
    this.emit('recordingStarted');

    this.log('Recording started');
  }

  /**
   * Stop recording and get the recorded Blob.
   */
  stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this._isRecording) {
        resolve(new Blob());
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: this.getSupportedMimeType(),
        });
        this._isRecording = false;
        this.emit('recordingStopped', blob);
        resolve(blob);
      };

      this.mediaRecorder.stop();
      this.log('Recording stopped');
    });
  }

  // ═══════════════ Private Methods ═══════════════

  private async resolveServerUrl(): Promise<string> {
    try {
      const res = await fetch(`${this.config.serverUrl}/join-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: this.roomId }),
      });
      const data = await res.json();
      return data.serverURL || this.config.serverUrl;
    } catch {
      // Fallback: connect directly (single-node setup)
      return this.config.serverUrl;
    }
  }

  private async publishLocalMedia(): Promise<void> {
    const constraints = this.config.mediaConstraints || {
      audio: true,
      video: true,
    };

    try {
      this._localStream =
        await navigator.mediaDevices.getUserMedia(constraints);
      this.emit('localStream', this._localStream);

      const videoTrack = this._localStream.getVideoTracks()[0];
      const audioTrack = this._localStream.getAudioTracks()[0];

      if (videoTrack) {
        await this.media.produce(videoTrack);
      }
      if (audioTrack) {
        await this.media.produce(audioTrack);
      }
    } catch (err: any) {
      throw new MediaError(`Failed to get user media: ${err.message}`);
    }
  }

  private async consumeProducer(
    producerId: string,
    userId: string,
    kind: 'audio' | 'video',
  ): Promise<void> {
    try {
      const consumer = await this.media.consume(producerId);
      const stream = new MediaStream([consumer.track]);

      // Update peer info
      let peer = this._peers.get(userId);
      if (!peer) {
        peer = {
          peerId: userId,
          userId,
          streams: new Map(),
          producerIds: {},
          isHandRaised: false,
        };
        this._peers.set(userId, peer);
      }

      peer.streams.set(producerId, stream);
      peer.producerIds[kind] = producerId;

      // Track audio for active speaker
      if (kind === 'audio') {
        this.activeSpeaker.addTrack(userId, userId, consumer.track);
      }

      // Handle consumer closure from producer side
      consumer.on('transportclose', () => {
        peer!.streams.delete(producerId);
        this.emit('peerStreamRemoved', { peerId: userId, producerId });

        if (kind === 'audio') {
          this.activeSpeaker.removeTrack(userId);
        }
      });

      // Emit event based on whether this is a new peer or existing
      if (peer.streams.size === 1) {
        this.emit('peerJoined', { peerId: userId, userId, stream, kind });
      } else {
        this.emit('peerStreamAdded', {
          peerId: userId,
          userId,
          stream,
          kind,
        });
      }
    } catch (err) {
      this.log('Failed to consume producer:', producerId, err);
    }
  }

  private setupSignalingListeners(): void {
    // New producer from a remote peer
    this.signaling.onNewProducer(async ({ producerId, userId, kind }) => {
      await this.consumeProducer(
        producerId,
        userId,
        kind as 'audio' | 'video',
      );
    });

    // A remote producer was closed
    this.signaling.onProducerClosed(({ remoteProducerId }) => {
      this.media.closeConsumer(remoteProducerId);

      // Find and update peer
      this._peers.forEach((peer) => {
        if (peer.streams.has(remoteProducerId)) {
          peer.streams.delete(remoteProducerId);
          this.emit('peerStreamRemoved', {
            peerId: peer.userId,
            producerId: remoteProducerId,
          });
        }
      });
    });

    // A peer left the room
    this.signaling.onPeerLeft(({ userId }) => {
      const peer = this._peers.get(userId);
      if (peer) {
        // Close all consumers for this peer
        peer.streams.forEach((_stream, producerId) => {
          this.media.closeConsumer(producerId);
        });
        this.activeSpeaker.removeTrack(userId);
        this._peers.delete(userId);
        this.emit('peerLeft', { peerId: userId, userId });
      }
    });

    // Chat message from a remote peer
    this.signaling.onChatMessage((message) => {
      // Don't duplicate our own messages
      if (message.senderId !== this._userId) {
        this._chatMessages.push(message);
        this.emit('chatMessage', message);
      }
    });

    // Hand raise from a remote peer
    this.signaling.onHandRaised(({ userId, raised }) => {
      const peer = this._peers.get(userId);
      if (peer) {
        peer.isHandRaised = raised;
        this.emit('handRaised', { peerId: userId, userId, raised });
      }
    });
  }

  private setConnectionState(state: ConnectionState): void {
    this._connectionState = state;
    this.emit('connectionStateChanged', state);
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'video/webm';
  }

  private log(...args: any[]): void {
    if (this.config.debug) console.log('[HiveRTC:Room]', ...args);
  }
}
