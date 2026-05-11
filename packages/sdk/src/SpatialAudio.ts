// ═══════════════════════════════════════════════════════════════
// HiveRTC SDK — Spatial Audio Engine
// Web Audio API HRTF-based positional audio.
// Peers sound louder/quieter and pan left/right based on
// their 2D position relative to the listener.
// ═══════════════════════════════════════════════════════════════

export interface SpatialAudioOptions {
  /** Maximum audible distance in canvas pixels (default 500) */
  maxDistance?: number;
  /** Reference distance for volume rolloff (default 1) */
  refDistance?: number;
  /** How quickly volume falls off with distance (default 1) */
  rolloffFactor?: number;
  /** Pixels-to-audio-unit scale factor (default 50) */
  pxToAudio?: number;
}

interface AudioNodeSet {
  source: MediaStreamAudioSourceNode;
  panner: PannerNode;
  gain: GainNode;
}

export class SpatialAudioEngine {
  private audioCtx: AudioContext | null = null;
  private nodes = new Map<string, AudioNodeSet>();
  private localPos = { x: 0, y: 0 };
  private maxDistance: number;
  private refDistance: number;
  private rolloffFactor: number;
  private pxToAudio: number;

  constructor(options: SpatialAudioOptions = {}) {
    this.maxDistance = options.maxDistance ?? 500;
    this.refDistance = options.refDistance ?? 1;
    this.rolloffFactor = options.rolloffFactor ?? 1;
    this.pxToAudio = options.pxToAudio ?? 50;
  }

  /** Lazily initialize the AudioContext (must be called after user gesture). */
  init(): void {
    if (this.audioCtx) return;
    this.audioCtx = new AudioContext();
    // Position listener at origin
    const L = this.audioCtx.listener;
    if (L.positionX) {
      L.positionX.value = 0;
      L.positionY.value = 0;
      L.positionZ.value = 0;
    }
  }

  /**
   * Attach a remote peer's audio track to the spatial engine.
   * Audio will be played through the AudioContext destination
   * with HRTF-based panning — do NOT also play it via <audio>.
   */
  attach(userId: string, track: MediaStreamTrack): void {
    if (!this.audioCtx) this.init();
    this.detach(userId); // Remove existing if any

    const stream = new MediaStream([track]);
    const source = this.audioCtx!.createMediaStreamSource(stream);
    const panner = this.audioCtx!.createPanner();
    const gain = this.audioCtx!.createGain();

    // HRTF for realistic spatial audio
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.maxDistance = this.maxDistance / this.pxToAudio;
    panner.refDistance = this.refDistance;
    panner.rolloffFactor = this.rolloffFactor;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;

    source.connect(panner);
    panner.connect(gain);
    gain.connect(this.audioCtx!.destination);

    this.nodes.set(userId, { source, panner, gain });
  }

  /** Remove a peer's audio from the spatial engine. */
  detach(userId: string): void {
    const node = this.nodes.get(userId);
    if (node) {
      node.source.disconnect();
      node.panner.disconnect();
      node.gain.disconnect();
      this.nodes.delete(userId);
    }
  }

  /** Update the listener (local user) position. */
  updateListenerPosition(pos: { x: number; y: number }): void {
    this.localPos = pos;
    if (!this.audioCtx) return;
    const L = this.audioCtx.listener;
    if (L.positionX) {
      L.positionX.value = pos.x / this.pxToAudio;
      L.positionY.value = pos.y / this.pxToAudio;
    }
  }

  /** Update a remote peer's position for panning. */
  updatePeerPosition(userId: string, pos: { x: number; y: number }): void {
    const node = this.nodes.get(userId);
    if (!node) return;
    node.panner.positionX.value = pos.x / this.pxToAudio;
    node.panner.positionY.value = pos.y / this.pxToAudio;
    node.panner.positionZ.value = 0;
  }

  /** Set gain for a specific peer (0–2). */
  setGain(userId: string, value: number): void {
    const node = this.nodes.get(userId);
    if (node) {
      node.gain.gain.setTargetAtTime(
        Math.max(0, Math.min(2, value)),
        this.audioCtx!.currentTime,
        0.1,
      );
    }
  }

  /** Get distance in canvas pixels between local user and a peer. */
  getDistance(userId: string): number {
    const node = this.nodes.get(userId);
    if (!node) return Infinity;
    const px = node.panner.positionX.value * this.pxToAudio;
    const py = node.panner.positionY.value * this.pxToAudio;
    return Math.sqrt(
      (this.localPos.x - px) ** 2 + (this.localPos.y - py) ** 2,
    );
  }

  /** Get the number of attached peers. */
  get peerCount(): number {
    return this.nodes.size;
  }

  /** Clean up everything. */
  destroy(): void {
    this.nodes.forEach((n) => {
      n.source.disconnect();
      n.panner.disconnect();
      n.gain.disconnect();
    });
    this.nodes.clear();
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
  }
}
