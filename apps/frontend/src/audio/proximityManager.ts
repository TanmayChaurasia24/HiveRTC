// ═══════════════════════════════════════════════════════
// PART 2 — Proximity Manager
// Core state machine for proximity-based consumer lifecycle.
// Runs on every position update and manages audio/video consumers.
// ═══════════════════════════════════════════════════════

import type { Socket } from 'socket.io-client';
import type { types } from 'mediasoup-client';
import {
  spatialAudio,
  R_AUDIO,
  R_VIDEO,
  HYSTERESIS,
  WELCOME_WINDOW_MS,
  WELCOME_RADIUS_MULT,
} from './spatialAudio';

// ── Distance helper ──
export function euclidean(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ── Consumer state (const object to comply with erasableSyntaxOnly) ──
export const ConsumerState = {
  NONE: 'none',
  AUDIO_ONLY: 'audio_only',
  AUDIO_VIDEO: 'audio_video',
  PAUSED: 'paused',
} as const;

export type ConsumerState = (typeof ConsumerState)[keyof typeof ConsumerState];

// ── Per-peer record tracking consumer lifecycle ──
export interface PeerConsumerRecord {
  state: ConsumerState;
  audioConsumer?: types.Consumer;
  videoConsumer?: types.Consumer;
  producerIds: { audio?: string; video?: string };
  videoElement?: HTMLVideoElement;
}

export class ProximityManager {
  /** All known remote peers and their consumer state */
  peers: Map<string, PeerConsumerRecord>;

  private myJoinTime: number = Date.now();

  // ── Injected dependencies (set after construction) ──
  sfuSocket!: Socket;
  recvTransport!: types.Transport;
  device!: types.Device;
  /** Getter so it's always fresh — pass () => myPosRef.current */
  myPos!: () => { x: number; y: number };

  constructor() {
    this.peers = new Map();
  }

  /**
   * Call when a remote user's producerIds become known
   * (from sfu_comm room-joined event or newProducer event).
   */
  registerPeer(
    userId: string,
    producerIds: { audio?: string; video?: string }
  ): void {
    console.log('[Proximity] registerPeer:', userId, producerIds);
    if (!this.peers.has(userId)) {
      this.peers.set(userId, {
        state: ConsumerState.NONE,
        producerIds,
      });
    } else {
      this.peers.get(userId)!.producerIds = {
        ...this.peers.get(userId)!.producerIds,
        ...producerIds,
      };
    }
  }

  /**
   * Call on EVERY WebSocket position update for ANY remote user.
   * Drives the proximity state machine.
   */
  async onPositionUpdate(
    userId: string,
    remotePos: { x: number; y: number }
  ): Promise<void> {
    const peer = this.peers.get(userId);
    if (!peer) return;

    const my = this.myPos();
    if (!my) return;
    const dist = euclidean(my, remotePos);

    console.log(`[Proximity] ${userId.slice(0,8)}... dist=${dist.toFixed(0)}px state=${peer.state} (R_VIDEO=${R_VIDEO} R_AUDIO=${R_AUDIO})`);

    // Determine effective radii (Welcome Window: expand for first WELCOME_WINDOW_MS)
    const isWelcome = Date.now() - this.myJoinTime < WELCOME_WINDOW_MS;
    const effectiveAudio = isWelcome ? R_AUDIO * WELCOME_RADIUS_MULT : R_AUDIO;
    const effectiveVideo = isWelcome ? R_VIDEO * WELCOME_RADIUS_MULT : R_VIDEO;

    // Update PannerNode position regardless of consumer state
    spatialAudio.updatePosition(userId, remotePos, my);

    // ── State machine transitions ──

    if (dist <= effectiveVideo) {
      // Target state: AUDIO_VIDEO
      if (peer.state === ConsumerState.NONE) {
        await this._admitAudio(userId, peer);
        await this._admitVideo(userId, peer);
      } else if (peer.state === ConsumerState.AUDIO_ONLY) {
        await this._admitVideo(userId, peer);
      } else if (peer.state === ConsumerState.PAUSED) {
        await this._resumeAll(userId, peer);
        await this._admitVideo(userId, peer);
      }
    } else if (dist <= effectiveAudio) {
      // Target state: AUDIO_ONLY
      if (peer.state === ConsumerState.NONE) {
        await this._admitAudio(userId, peer);
      } else if (peer.state === ConsumerState.AUDIO_VIDEO) {
        await this._revokeVideo(userId, peer);
      } else if (peer.state === ConsumerState.PAUSED) {
        await this._resumeAll(userId, peer);
      }
    } else if (dist > effectiveAudio + HYSTERESIS) {
      // Target state: PAUSED or NONE
      // HYSTERESIS: only revoke if user has moved BEYOND r_audio + δ
      if (
        peer.state === ConsumerState.AUDIO_VIDEO ||
        peer.state === ConsumerState.AUDIO_ONLY
      ) {
        await this._pauseAll(userId, peer);
      }
      // If already PAUSED and even further out, close consumers to free memory
      if (
        peer.state === ConsumerState.PAUSED &&
        dist > effectiveAudio + HYSTERESIS * 3
      ) {
        await this._closeAll(userId, peer);
      }
    }
  }

  /**
   * Reset join time (call when user re-joins a room).
   */
  resetJoinTime(): void {
    this.myJoinTime = Date.now();
  }

  /**
   * Call when a remote user disconnects entirely.
   */
  async onPeerLeft(userId: string): Promise<void> {
    const peer = this.peers.get(userId);
    if (peer) {
      await this._closeAll(userId, peer);
    }
    this.peers.delete(userId);
  }

  // ══════════════════════════════════════════════════════
  // Private helpers — consumer lifecycle
  // ══════════════════════════════════════════════════════

  private async _admitAudio(
    userId: string,
    peer: PeerConsumerRecord
  ): Promise<void> {
    if (!peer.producerIds.audio || peer.audioConsumer) return;

    console.log('[Proximity] _admitAudio: consuming producerId', peer.producerIds.audio);
    const params = await this._consumeFromSFU(peer.producerIds.audio);
    if (!params) {
      console.error('[Proximity] _admitAudio: consume FAILED (null response)');
      return;
    }
    console.log('[Proximity] _admitAudio: consume OK, creating client consumer');

    const consumer = await this.recvTransport.consume(params);
    peer.audioConsumer = consumer;

    // Tell server consumer is ready to receive FIRST (so audio data starts flowing)
    this.sfuSocket.emit('consumer-resume', { consumerId: consumer.id });

    // Then attach to Web Audio API — audio comes from PannerNode, not HTML elements
    await spatialAudio.attach(userId, consumer.track);
    this._setState(peer, ConsumerState.AUDIO_ONLY);
  }

  private async _admitVideo(
    userId: string,
    peer: PeerConsumerRecord
  ): Promise<void> {
    if (!peer.producerIds.video || peer.videoConsumer) return;

    const params = await this._consumeFromSFU(peer.producerIds.video);
    if (!params) return;

    const consumer = await this.recvTransport.consume(params);
    peer.videoConsumer = consumer;

    // Emit custom event so React can create/update the <video> element
    window.dispatchEvent(
      new CustomEvent('hive:videoReady', {
        detail: { userId, track: consumer.track },
      })
    );
    this.sfuSocket.emit('consumer-resume', { consumerId: consumer.id });
    this._setState(peer, ConsumerState.AUDIO_VIDEO);
  }

  private async _revokeVideo(
    userId: string,
    peer: PeerConsumerRecord
  ): Promise<void> {
    if (!peer.videoConsumer) return;

    this.sfuSocket.emit('pauseConsumer', {
      consumerId: peer.videoConsumer.id,
    });
    peer.videoConsumer.pause();
    window.dispatchEvent(
      new CustomEvent('hive:videoRemoved', { detail: { userId } })
    );
    this._setState(peer, ConsumerState.AUDIO_ONLY);
  }

  private async _pauseAll(
    userId: string,
    peer: PeerConsumerRecord
  ): Promise<void> {
    // Soft pause: consumers stay alive, audio fades out
    if (peer.audioConsumer) {
      this.sfuSocket.emit('pauseConsumer', {
        consumerId: peer.audioConsumer.id,
      });
      peer.audioConsumer.pause();
    }
    if (peer.videoConsumer) {
      this.sfuSocket.emit('pauseConsumer', {
        consumerId: peer.videoConsumer.id,
      });
      peer.videoConsumer.pause();
      window.dispatchEvent(
        new CustomEvent('hive:videoRemoved', { detail: { userId } })
      );
    }
    spatialAudio.setGain(userId, 0); // fade audio out gracefully
    this._setState(peer, ConsumerState.PAUSED);
  }

  private async _resumeAll(
    userId: string,
    peer: PeerConsumerRecord
  ): Promise<void> {
    if (peer.audioConsumer) {
      peer.audioConsumer.resume();
      this.sfuSocket.emit('consumer-resume', {
        consumerId: peer.audioConsumer.id,
      });
    }
    if (peer.videoConsumer) {
      peer.videoConsumer.resume();
      this.sfuSocket.emit('consumer-resume', {
        consumerId: peer.videoConsumer.id,
      });
      window.dispatchEvent(
        new CustomEvent('hive:videoReady', {
          detail: { userId, track: peer.videoConsumer.track },
        })
      );
    }
    spatialAudio.setGain(userId, 1); // fade audio back in
  }

  private async _closeAll(
    userId: string,
    peer?: PeerConsumerRecord
  ): Promise<void> {
    if (!peer) return;

    if (peer.audioConsumer) {
      this.sfuSocket.emit('closeConsumer', {
        consumerId: peer.audioConsumer.id,
      });
      peer.audioConsumer.close();
    }
    if (peer.videoConsumer) {
      this.sfuSocket.emit('closeConsumer', {
        consumerId: peer.videoConsumer.id,
      });
      peer.videoConsumer.close();
      window.dispatchEvent(
        new CustomEvent('hive:videoRemoved', { detail: { userId } })
      );
    }

    spatialAudio.detach(userId);
    this._setState(peer, ConsumerState.NONE);
    peer.audioConsumer = undefined;
    peer.videoConsumer = undefined;
  }

  private async _consumeFromSFU(producerId: string): Promise<any> {
    return new Promise((resolve) => {
      console.log('[Proximity] _consumeFromSFU: requesting consume for', producerId);
      this.sfuSocket.emit(
        'consume',
        {
          remoteProducerId: producerId,
          rtpCapabilities: this.device.rtpCapabilities,
          transportId: this.recvTransport.id,
        },
        (response: any) => {
          console.log('[Proximity] _consumeFromSFU: response', response);
          resolve(response?.error ? null : response);
        }
      );
    });
  }

  private _setState(peer: PeerConsumerRecord, state: ConsumerState): void {
    peer.state = state;
  }
}

// ── Singleton export ──
export const proximityManager = new ProximityManager();
