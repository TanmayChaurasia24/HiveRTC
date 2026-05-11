// ═══════════════════════════════════════════════════════════════
// HiveRTC SDK — Active Speaker Detection
// Uses Web Audio API AnalyserNode to monitor audio levels
// and detect the loudest speaker in real-time.
// ═══════════════════════════════════════════════════════════════

const ANALYSIS_INTERVAL_MS = 200;
const SILENCE_THRESHOLD = 10; // dB threshold below which we consider silence

export interface SpeakerInfo {
  peerId: string;
  userId: string;
  volume: number; // 0–100 normalized
}

export class ActiveSpeakerDetector {
  private audioCtx: AudioContext | null = null;
  private analysers = new Map<
    string,
    {
      userId: string;
      analyser: AnalyserNode;
      source: MediaStreamAudioSourceNode;
    }
  >();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onActiveSpeaker: ((info: SpeakerInfo) => void) | null = null;
  private lastSpeaker: string | null = null;

  /**
   * Start monitoring active speaker.
   * @param callback Fired when the active speaker changes.
   */
  start(callback: (info: SpeakerInfo) => void): void {
    this.onActiveSpeaker = callback;
    this.audioCtx = new AudioContext();

    this.intervalId = setInterval(() => {
      this.analyze();
    }, ANALYSIS_INTERVAL_MS);
  }

  /**
   * Add a remote audio track for monitoring.
   */
  addTrack(peerId: string, userId: string, track: MediaStreamTrack): void {
    if (!this.audioCtx) return;

    // Remove existing analyser for this peer if any
    this.removeTrack(peerId);

    const stream = new MediaStream([track]);
    const source = this.audioCtx.createMediaStreamSource(stream);
    const analyser = this.audioCtx.createAnalyser();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;

    source.connect(analyser);
    // Don't connect to destination — we only analyse, don't play

    this.analysers.set(peerId, { userId, analyser, source });
  }

  /**
   * Remove a peer's audio track from monitoring.
   */
  removeTrack(peerId: string): void {
    const entry = this.analysers.get(peerId);
    if (entry) {
      entry.source.disconnect();
      this.analysers.delete(peerId);
    }
  }

  /**
   * Stop all monitoring and cleanup.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.analysers.forEach((entry) => entry.source.disconnect());
    this.analysers.clear();

    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }

    this.onActiveSpeaker = null;
    this.lastSpeaker = null;
  }

  // ── Private ──

  private analyze(): void {
    if (!this.onActiveSpeaker || this.analysers.size === 0) return;

    let loudestPeer: string | null = null;
    let loudestUserId = '';
    let loudestVolume = 0;

    this.analysers.forEach(({ userId, analyser }, peerId) => {
      const volume = this.getVolume(analyser);
      if (volume > loudestVolume && volume > SILENCE_THRESHOLD) {
        loudestPeer = peerId;
        loudestUserId = userId;
        loudestVolume = volume;
      }
    });

    // Only emit when active speaker changes
    if (loudestPeer && loudestPeer !== this.lastSpeaker) {
      this.lastSpeaker = loudestPeer;
      this.onActiveSpeaker({
        peerId: loudestPeer,
        userId: loudestUserId,
        volume: Math.min(100, Math.round(loudestVolume)),
      });
    }

    // If all silent, reset
    if (!loudestPeer && this.lastSpeaker) {
      this.lastSpeaker = null;
    }
  }

  private getVolume(analyser: AnalyserNode): number {
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const normalized = (data[i]! - 128) / 128;
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / data.length);
    // Convert to a 0–100 scale
    return Math.round(rms * 100 * 5);
  }
}
