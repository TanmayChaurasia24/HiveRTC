export const config = {
  listenIp: "0.0.0.0",
  listenPort: 3000,

  mediasoup: {
    worker: {
      rtcMinPort: 20000,
      rtcMaxPort: 20200,
    },

    router: {
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
          clockrate: 90000,
        },
      ],
    },

    webRtcTransport: {
      listenIps: [
        {
          ip: "0.0.0.0",
          announcedIp: null,
        },
      ],
      maxIncommingBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000,
    },
  },
};
