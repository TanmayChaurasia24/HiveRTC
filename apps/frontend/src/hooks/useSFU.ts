import { useRef, useState, useCallback, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Device } from "mediasoup-client";
import { types } from "mediasoup-client";
import { proximityManager } from "../audio/proximityManager";
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

  // Note: consumeRemote was removed. Consumer creation is now handled
  // entirely by proximityManager based on spatial distance.

  const joinRoom = useCallback(async (roomId: string, userId?: string) => {
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
        socket.emit("join_room", { roomId, userId }, async (response: any) => {
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

          // Inject device into proximityManager for consume calls
          proximityManager.device = device;

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

          // ── Inject dependencies into proximityManager ──
          proximityManager.sfuSocket = socket;
          proximityManager.recvTransport = recvTransportRef.current;
          proximityManager.device = device;
          proximityManager.resetJoinTime();

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

          // 6. Register existing network peers with proximity manager
          // (proximityManager will create consumers based on distance)
          if (existingProducers && Array.isArray(existingProducers)) {
            for (const p of existingProducers) {
              if (p.userId && p.kind) {
                const existing = proximityManager.peers.get(p.userId);
                const ids = existing?.producerIds ?? {};
                ids[p.kind as 'audio' | 'video'] = p.producerId;
                proximityManager.registerPeer(p.userId, ids);
              }
            }
            // Trigger immediate proximity evaluation for newly registered peers
            window.dispatchEvent(new CustomEvent('hive:peersRegistered'));
          }
        });
      });

      socket.on("new-producer", async ({ producerId, socketId: _socketId, userId, kind }: any) => {
        // Register with proximity manager — it will create consumers based on distance
        if (userId && kind) {
          const existing = proximityManager.peers.get(userId);
          const ids = existing?.producerIds ?? {};
          ids[kind as 'audio' | 'video'] = producerId;
          proximityManager.registerPeer(userId, ids);
          // Trigger immediate proximity evaluation for the new peer
          window.dispatchEvent(new CustomEvent('hive:peersRegistered'));
        }
      });

      socket.on("producer-closed", ({ remoteProducerId }: any) => {
        setRemoteMedia((prev) =>
          prev.filter((m) => m.producerId !== remoteProducerId)
        );
        consumersRef.current.get(remoteProducerId)?.close();
        consumersRef.current.delete(remoteProducerId);
      });

      // Clean up spatial audio when a peer leaves the SFU room
      socket.on("peerLeft", ({ userId }: any) => {
        proximityManager.onPeerLeft(userId);
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
      } else {
        audioProducer.resume();
      }
    }
    
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !isMicOn;
    }
    
    setIsMicOn(!isMicOn);
  }, [isMicOn, localStream]);

  const toggleCam = useCallback(() => {
    const videoProducer = producersRef.current.get("video");
    if (videoProducer) {
      if (isCamOn) {
        videoProducer.pause();
      } else {
        videoProducer.resume();
      }
    }
    
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !isCamOn;
    }
    
    setIsCamOn(!isCamOn);
  }, [isCamOn, localStream]);

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
    // Exposed for spatial audio integration in Game.tsx
    socketRef,
    deviceRef,
    recvTransportRef,
  };
}
