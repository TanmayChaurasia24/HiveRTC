// ═══════════════════════════════════════════════════════
// PART 1 — Spatial Audio Manager (singleton)
// Web Audio API PannerNodes for HRTF-based positional audio
// ═══════════════════════════════════════════════════════

// ── Tunable constants (adjust without touching logic) ──
export const R_AUDIO = 200;            // audio-only admit radius in canvas px
export const R_VIDEO = 100;            // audio+video admit radius in canvas px
export const HYSTERESIS = 50;          // revoke buffer — user must move to r+50 before consumer closes
export const MAX_DISTANCE = 500;       // PannerNode maxDistance, matches R_AUDIO scale
export const WELCOME_WINDOW_MS = 2000; // pre-fetch window on join
export const WELCOME_RADIUS_MULT = 2;  // pre-fetch at R_AUDIO * 2 for first WELCOME_WINDOW_MS

// Normalize canvas px to audio units (PannerNode uses metres)
const PX_TO_AUDIO = 50;

interface AudioNodeSet {
  source: MediaStreamAudioSourceNode;
  panner: PannerNode;
  gainNode: GainNode;
}

class SpatialAudioManager {
  private audioCtx: AudioContext | null = null;
  private nodes: Map<string, AudioNodeSet>;

  constructor() {
    this.nodes = new Map();
  }

  /**
   * Lazily create and resume the AudioContext.
   * Called right before any audio operation to ensure the context is ready.
   * Browsers require a user gesture to start AudioContext — by the time
   * "Join Call" is clicked, we have that gesture.
   */
  private async ensureContext(): Promise<AudioContext> {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
      console.log('[SpatialAudio] Created AudioContext, state:', this.audioCtx.state);
    }

    if (this.audioCtx.state === 'suspended') {
      console.log('[SpatialAudio] Resuming suspended AudioContext...');
      await this.audioCtx.resume();
      console.log('[SpatialAudio] AudioContext resumed, state:', this.audioCtx.state);
    }

    return this.audioCtx;
  }

  /**
   * Attach a remote user's audio track to the spatial audio pipeline.
   * Graph: source → panner (HRTF) → gain → destination
   */
  async attach(userId: string, audioTrack: MediaStreamTrack): Promise<void> {
    const ctx = await this.ensureContext();

    // Detach any existing node for this user first
    if (this.nodes.has(userId)) {
      this.detach(userId);
    }

    const stream = new MediaStream([audioTrack]);
    const source = ctx.createMediaStreamSource(stream);

    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'linear';
    panner.refDistance = 1;
    panner.maxDistance = MAX_DISTANCE;
    panner.rolloffFactor = 1;

    const gainNode = ctx.createGain();
    gainNode.gain.value = 1.0;

    source.connect(panner);
    panner.connect(gainNode);
    gainNode.connect(ctx.destination);

    this.nodes.set(userId, { source, panner, gainNode });
    console.log('[SpatialAudio] Attached audio for', userId, '| AudioContext state:', ctx.state);
  }

  /**
   * Update the PannerNode position for a remote user relative to the local user.
   * Canvas Y axis maps to audio Z axis (forward/backward).
   */
  updatePosition(
    userId: string,
    remotePos: { x: number; y: number },
    myPos: { x: number; y: number }
  ): void {
    const node = this.nodes.get(userId);
    if (!node || !this.audioCtx) return;

    const relX = (remotePos.x - myPos.x) / PX_TO_AUDIO;
    const relZ = (remotePos.y - myPos.y) / PX_TO_AUDIO; // canvas Y → audio Z axis
    const t = this.audioCtx.currentTime;

    node.panner.positionX.setValueAtTime(relX, t);
    node.panner.positionY.setValueAtTime(0, t);
    node.panner.positionZ.setValueAtTime(relZ, t);
  }

  /**
   * Smoothly ramp gain for a user (used for fade-in/fade-out on pause/resume).
   */
  setGain(userId: string, value: number): void {
    const node = this.nodes.get(userId);
    if (!node || !this.audioCtx) return;
    node.gainNode.gain.linearRampToValueAtTime(value, this.audioCtx.currentTime + 0.3);
  }

  /**
   * Gracefully detach a user's audio graph (fade out then disconnect).
   */
  detach(userId: string): void {
    const node = this.nodes.get(userId);
    if (!node || !this.audioCtx) return;

    node.gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.2);
    setTimeout(() => {
      node.source.disconnect();
      node.panner.disconnect();
      node.gainNode.disconnect();
      this.nodes.delete(userId);
    }, 300);
  }
}

// ── Singleton export — only one AudioContext in the entire app ──
export const spatialAudio = new SpatialAudioManager();
