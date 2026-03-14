import * as mediasoup from "mediasoup";
import os from "os";

export const config = {
  listenIp: "0.0.0.0",
  listenPort: 9000,
  mediasoup: {
    numWorkers: os.cpus().length,
    workerSettings: {
      logLevel: "warn",
      logTags: ["info", "ice", "dtls", "sctp", "rtp", "rtcp"],
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
    } as mediasoup.types.WorkerSettings,

    //router settings
    routerOptions: {
      mediaCodecs: [
        {
          kind: "audio",
          mimeType: "audio/opus",
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: "video",
          mimeType: "video/VP8",
          clockRate: 90000,
          parameters: { "x-google-start-bitrate": 1000 },
        },
        {
          kind: "video",
          mimeType: "video/VP9",
          clockRate: 90000,
          parameters: { "x-google-start-bitrate": 1000 },
        },
        {
          kind: "video",
          mimeType: "video/H264",
          clockRate: 90000,
          parameters: {
            "packetization-mode": 1,
            "profile-level-id": "42e01f", // Common baseline profile for browsers
            "level-asymmetry-allowed": 1,
          },
        },
      ],
    } as mediasoup.types.RouterOptions,

    //transport settings
    webRtcTransportOptions: {
      listenIps: [
        {
          ip: "0.0.0.0",
          announcedIp: process.env.ANNOUNCED_IP || "127.0.0.1",
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      enableSctp: true,
    } as mediasoup.types.WebRtcTransportOptions,
  },
};
