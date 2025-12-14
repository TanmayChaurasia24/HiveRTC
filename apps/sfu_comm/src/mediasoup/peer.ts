import * as mediasoup from "mediasoup";

type Transport = mediasoup.types.Transport;
type Producer = mediasoup.types.Producer;
type Consumer = mediasoup.types.Consumer;

export class Peer {
  transports = new Map<string, Transport>();
  producers = new Map<string, Producer>();
  consumers = new Map<string, Consumer>();

  constructor(public socketid: string) {}
}
