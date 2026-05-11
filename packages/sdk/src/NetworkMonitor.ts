// ═══════════════════════════════════════════════════════════════
// HiveRTC SDK — Network Quality Monitor
// Polls WebRTC transport stats to compute a quality score.
// Reports RTT, packet loss, and bandwidth in real-time.
// ═══════════════════════════════════════════════════════════════

import type { NetworkQuality } from './types.js';
import type { types } from 'mediasoup-client';

const POLL_INTERVAL_MS = 3000;

export class NetworkMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private sendTransport: types.Transport | null = null;
  private onQualityChange: ((quality: NetworkQuality) => void) | null =
    null;
  private lastQuality: NetworkQuality | null = null;

  /**
   * Start monitoring network quality on the given send transport.
   */
  start(
    transport: types.Transport,
    callback: (quality: NetworkQuality) => void,
  ): void {
    this.sendTransport = transport;
    this.onQualityChange = callback;

    this.intervalId = setInterval(() => {
      this.poll();
    }, POLL_INTERVAL_MS);

    // Initial poll
    this.poll();
  }

  /**
   * Stop monitoring.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.sendTransport = null;
    this.onQualityChange = null;
  }

  // ── Private ──

  private async poll(): Promise<void> {
    if (!this.sendTransport || !this.onQualityChange) return;

    try {
      const stats = await this.sendTransport.getStats();
      const quality = this.computeQuality(stats);

      // Only emit if quality score changed
      if (!this.lastQuality || this.lastQuality.score !== quality.score) {
        this.onQualityChange(quality);
      }
      this.lastQuality = quality;
    } catch {
      // Transport might be closed — ignore
    }
  }

  private computeQuality(stats: any): NetworkQuality {
    let rtt = 0;
    let packetLoss = 0;
    let bytesSent = 0;

    // RTCStatsReport iteration
    if (stats && typeof stats.forEach === 'function') {
      stats.forEach((report: any) => {
        // Candidate pair stats contain RTT
        if (report.type === 'candidate-pair' && report.currentRoundTripTime) {
          rtt = report.currentRoundTripTime * 1000; // seconds → ms
        }

        // Outbound RTP contains packet loss info
        if (report.type === 'outbound-rtp') {
          bytesSent += report.bytesSent || 0;
        }

        // Remote inbound RTP has packet loss
        if (report.type === 'remote-inbound-rtp') {
          const lost = report.packetsLost || 0;
          const received = report.packetsReceived || 1;
          packetLoss = (lost / (lost + received)) * 100;
        }
      });
    }

    // Estimate bandwidth (kbps) — rough approximation
    const availableBandwidth = Math.round((bytesSent * 8) / 1000);

    // Compute score
    const score = this.calculateScore(rtt, packetLoss);

    return {
      score,
      rtt: Math.round(rtt),
      packetLoss: Math.round(packetLoss * 100) / 100,
      availableBandwidth,
    };
  }

  private calculateScore(
    rtt: number,
    packetLoss: number,
  ): 1 | 2 | 3 | 4 | 5 {
    // Simple heuristic based on RTT and packet loss
    if (rtt < 50 && packetLoss < 1) return 5;
    if (rtt < 100 && packetLoss < 3) return 4;
    if (rtt < 200 && packetLoss < 5) return 3;
    if (rtt < 400 && packetLoss < 10) return 2;
    return 1;
  }
}
