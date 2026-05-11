// ═══════════════════════════════════════════════════════════════
// HiveRTC SDK — Media Engine
// Wraps mediasoup-client Device, send/recv transports, and
// producer/consumer lifecycle. Framework-agnostic.
// ═══════════════════════════════════════════════════════════════

import { Device } from 'mediasoup-client';
import type { types } from 'mediasoup-client';
import { SignalingClient } from './SignalingClient.js';
import { MediaError, TransportError } from './errors.js';

type Transport = types.Transport;
type Producer = types.Producer;
type Consumer = types.Consumer;

export class MediaEngine {
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producers = new Map<string, Producer>();
  private consumers = new Map<string, Consumer>();
  private signaling: SignalingClient;
  private debug: boolean;

  constructor(signaling: SignalingClient, debug = false) {
    this.signaling = signaling;
    this.debug = debug;
  }

  get rtpCapabilities(): any {
    return this.device?.rtpCapabilities;
  }

  get isLoaded(): boolean {
    return this.device?.loaded ?? false;
  }

  // ── Device ──

  async loadDevice(rtpCapabilities: any): Promise<void> {
    if (this.device?.loaded) return;
    this.device = new Device();
    await this.device.load({ routerRtpCapabilities: rtpCapabilities });
    this.log('Device loaded');
  }

  // ── Transport Creation ──

  async createSendTransport(): Promise<Transport> {
    const params = await this.signaling.createTransport();
    this.sendTransport = this.device!.createSendTransport(params);
    this.setupTransportEvents(this.sendTransport, 'send');
    this.log('Send transport created:', this.sendTransport.id);
    return this.sendTransport;
  }

  async createRecvTransport(): Promise<Transport> {
    const params = await this.signaling.createTransport();
    this.recvTransport = this.device!.createRecvTransport(params);
    this.setupTransportEvents(this.recvTransport, 'recv');
    this.log('Recv transport created:', this.recvTransport.id);
    return this.recvTransport;
  }

  private setupTransportEvents(
    transport: Transport,
    direction: 'send' | 'recv',
  ): void {
    transport.on(
      'connect',
      ({ dtlsParameters }: any, callback: any, errback: any) => {
        this.signaling
          .connectTransport(transport.id, dtlsParameters)
          .then(callback)
          .catch(errback);
      },
    );

    if (direction === 'send') {
      transport.on(
        'produce',
        async (
          { kind, rtpParameters, appData }: any,
          callback: any,
          errback: any,
        ) => {
          try {
            const id = await this.signaling.produce({
              transportId: transport.id,
              kind,
              rtpParameters,
              appData,
            });
            callback({ id });
          } catch (err) {
            errback(err);
          }
        },
      );
    }
  }

  // ── Produce ──

  async produce(
    track: MediaStreamTrack,
    appData?: any,
  ): Promise<Producer> {
    if (!this.sendTransport) {
      throw new TransportError('Send transport not created');
    }

    const producer = await this.sendTransport.produce({
      track,
      appData,
    });

    const label = appData?.type || track.kind;
    this.producers.set(label, producer);

    producer.on('transportclose', () => {
      this.producers.delete(label);
    });

    this.log('Producing:', label, producer.id);
    return producer;
  }

  // ── Consume ──

  async consume(remoteProducerId: string): Promise<Consumer> {
    if (!this.recvTransport || !this.device) {
      throw new TransportError('Recv transport or device not ready');
    }

    const response = await this.signaling.consume({
      rtpCapabilities: this.device.rtpCapabilities,
      remoteProducerId,
      transportId: this.recvTransport.id,
    });

    const consumer = await this.recvTransport.consume({
      id: response.id,
      producerId: remoteProducerId,
      kind: response.kind,
      rtpParameters: response.rtpParameters,
    });

    this.consumers.set(remoteProducerId, consumer);

    consumer.on('transportclose', () => {
      this.consumers.delete(remoteProducerId);
    });

    // Resume on server side
    this.signaling.resumeConsumer(response.id);

    this.log('Consuming:', remoteProducerId, '→', consumer.kind);
    return consumer;
  }

  // ── Producer Controls ──

  getProducer(label: string): Producer | undefined {
    return this.producers.get(label);
  }

  pauseProducer(label: string): void {
    const producer = this.producers.get(label);
    if (producer && !producer.closed) {
      producer.pause();
    }
  }

  resumeProducer(label: string): void {
    const producer = this.producers.get(label);
    if (producer && !producer.closed) {
      producer.resume();
    }
  }

  closeProducer(label: string): void {
    const producer = this.producers.get(label);
    if (producer && !producer.closed) {
      producer.close();
    }
    this.producers.delete(label);
  }

  // ── Consumer Controls ──

  getConsumer(producerId: string): Consumer | undefined {
    return this.consumers.get(producerId);
  }

  closeConsumer(producerId: string): void {
    const consumer = this.consumers.get(producerId);
    if (consumer && !consumer.closed) {
      this.signaling.closeConsumer(consumer.id);
      consumer.close();
    }
    this.consumers.delete(producerId);
  }

  // ── Cleanup ──

  closeAll(): void {
    this.log('Closing all producers and consumers');

    this.producers.forEach((p) => {
      if (!p.closed) p.close();
    });
    this.producers.clear();

    this.consumers.forEach((c) => {
      if (!c.closed) c.close();
    });
    this.consumers.clear();

    if (this.sendTransport && !this.sendTransport.closed) {
      this.sendTransport.close();
    }
    if (this.recvTransport && !this.recvTransport.closed) {
      this.recvTransport.close();
    }

    this.sendTransport = null;
    this.recvTransport = null;
  }

  private log(...args: any[]): void {
    if (this.debug) console.log('[HiveRTC:MediaEngine]', ...args);
  }
}
