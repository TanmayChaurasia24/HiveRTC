import { useRef, useState, useCallback, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Device } from "mediasoup-client";
import { types } from "mediasoup-client";
type Transport = types.Transport;
type Producer = types.Producer;
type Consumer = types.Consumer;

export type RemoteMedia = {
  producerId: string;
  kind: "audio" | "video";
  stream: MediaStream;
};

export function useSFU() {
  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);

  const producersRef = useRef<Map<string, Producer>>(new Map());
  const consumersRef = useRef<Map<string, Consumer>>(new Map());

  const [connectionState, setConnectionState] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [joined, setJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteMedia, setRemoteMedia] = useState<RemoteMedia[]>([]);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  const createTransport = (
    socket: Socket,
    device: Device,
    direction: "send" | "recv"
  ): Promise<Transport> => {
    return new Promise((resolve, reject) => {
      socket.emit("createWebRtcTransport", {}, async (response: any) => {
        if (response.error) return reject(response.error);

        const { params } = response;
        let transport: Transport;

        if (direction === "send") {
          transport = device.createSendTransport(params);
        } else {
          transport = device.createRecvTransport(params);
        }

        transport.on("connect", ({ dtlsParameters }: any, callback: any, errback: any) => {
          socket.emit(
            "transport-connect",
            {
              transportId: transport.id,
              dtlsParameters,
            },
            (res: any) => {
              if (res && res.error) errback(new Error(res.error));
              else callback();
            }
          );
        });

        if (direction === "send") {
          transport.on(
            "produce",
            async ({ kind, rtpParameters, appData }: any, callback: any, errback: any) => {
              socket.emit(
                "produce",
                {
                  transportId: transport.id,
                  kind,
                  rtpParameters,
                  appData,
                },
                (res: any) => {
                  if (res && res.error) errback(new Error(res.error));
                  else callback({ id: res.id });
                }
              );
            }
          );
        }

        resolve(transport);
      });
    });
  };

  const consumeRemote = async (
    socket: Socket,
    device: Device,
    recvTransport: Transport,
    producerId: string
  ) => {
    socket.emit(
      "consume",
      {
        rtpCapabilities: device.rtpCapabilities,
        remoteProducerId: producerId,
        transportId: recvTransport.id,
      },
      async (response: any) => {
        if (response.error) {
          console.error("Consume error:", response.error);
          return;
        }

        const { id, kind, rtpParameters } = response;
        const consumer = await recvTransport.consume({
          id,
          producerId,
          kind,
          rtpParameters,
        });

        consumersRef.current.set(producerId, consumer);

        const stream = new MediaStream([consumer.track]);
        setRemoteMedia((prev) => [
          ...prev,
          { producerId, kind: kind as "audio" | "video", stream },
        ]);

        // UNPAUSE immediately
        socket.emit("consumer-resume", { consumerId: id });
      }
    );
  };

  const joinRoom = useCallback(async (roomId: string) => {
    setConnectionState("connecting");
    setRemoteMedia([]);

    try {
      // 1. Auto-Join Logic - API call
      const res = await fetch("http://localhost:3002/join-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();
      const serverURL = data.serverURL || "ws://localhost:3002";

      // 2. Connect Socket
      const socket = io(serverURL, { transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join_room", { roomId }, async (response: any) => {
          if (response.error) {
            console.error(response.error);
            setConnectionState("error");
            return;
          }

          const { rtpCapabilities, existingProducers } = response;

          // 3. Init Device (only once)
          let device = deviceRef.current;
          if (!device) {
            device = new Device();
            await device.load({ routerRtpCapabilities: rtpCapabilities });
            deviceRef.current = device;
          }

          // 4. Create Transports
          sendTransportRef.current = await createTransport(
            socket,
            device,
            "send"
          );
          recvTransportRef.current = await createTransport(
            socket,
            device,
            "recv"
          );

          // 5. Produce Local Media
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
          setLocalStream(stream);

          const videoTrack = stream.getVideoTracks()[0];
          const audioTrack = stream.getAudioTracks()[0];

          if (videoTrack && sendTransportRef.current) {
            const videoProducer = await sendTransportRef.current.produce({
              track: videoTrack,
            });
            producersRef.current.set("video", videoProducer);
          }
          if (audioTrack && sendTransportRef.current) {
            const audioProducer = await sendTransportRef.current.produce({
              track: audioTrack,
            });
            producersRef.current.set("audio", audioProducer);
          }

          setJoined(true);
          setConnectionState("connected");

          // 6. Consume existing network peers
          if (existingProducers && Array.isArray(existingProducers)) {
            for (const p of existingProducers) {
              await consumeRemote(
                socket,
                device,
                recvTransportRef.current!,
                p.producerId
              );
            }
          }
        });
      });

      socket.on("new-producer", async ({ producerId }: any) => {
        if (deviceRef.current && recvTransportRef.current) {
          await consumeRemote(
            socket,
            deviceRef.current,
            recvTransportRef.current,
            producerId
          );
        }
      });

      socket.on("producer-closed", ({ remoteProducerId }: any) => {
        setRemoteMedia((prev) =>
          prev.filter((m) => m.producerId !== remoteProducerId)
        );
        consumersRef.current.get(remoteProducerId)?.close();
        consumersRef.current.delete(remoteProducerId);
      });
    } catch (err) {
      console.error(err);
      setConnectionState("error");
    }
  }, []);

  const toggleMic = useCallback(() => {
    const audioProducer = producersRef.current.get("audio");
    if (audioProducer) {
      if (isMicOn) {
        audioProducer.pause();
        setIsMicOn(false);
      } else {
        audioProducer.resume();
        setIsMicOn(true);
      }
    }
  }, [isMicOn]);

  const toggleCam = useCallback(() => {
    const videoProducer = producersRef.current.get("video");
    if (videoProducer) {
      if (isCamOn) {
        videoProducer.pause();
        setIsCamOn(false);
      } else {
        videoProducer.resume();
        setIsCamOn(true);
      }
    }
  }, [isCamOn]);

  const leaveRoom = useCallback(() => {
    socketRef.current?.disconnect();
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();
    producersRef.current.forEach((p) => p.close());
    consumersRef.current.forEach((c) => c.close());
    localStream?.getTracks().forEach((t) => t.stop());

    setJoined(false);
    setConnectionState("idle");
    setRemoteMedia([]);
    setLocalStream(null);
  }, [localStream]);

  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [localStream]);

  return {
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCam,
    localStream,
    remoteMedia,
    isMicOn,
    isCamOn,
    connectionState,
    joined,
  };
}
