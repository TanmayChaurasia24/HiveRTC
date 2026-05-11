// ═══════════════════════════════════════════════════════════════
// @hivertc/react — useHiveRoom Hook
// React hook that wraps the Room class from @hivertc/sdk.
// Provides reactive state + stable callbacks for React UIs.
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  HiveRTC,
  Room,
  type HiveRTCConfig,
  type JoinRoomOptions,
  type ConnectionState,
  type PeerInfo,
  type ChatMessage,
  type NetworkQuality,
} from '@hivertc/sdk';

export interface RemoteStream {
  peerId: string;
  userId: string;
  kind: 'audio' | 'video';
  stream: MediaStream;
}

export interface UseHiveRoomReturn {
  /** Join a room by ID */
  joinRoom: (roomId: string, options?: JoinRoomOptions) => Promise<void>;
  /** Leave the current room */
  leaveRoom: () => void;
  /** Toggle microphone */
  toggleMic: () => void;
  /** Toggle camera */
  toggleCam: () => void;
  /** Start screen sharing */
  shareScreen: () => Promise<void>;
  /** Stop screen sharing */
  stopScreenShare: () => void;
  /** Send a chat message */
  sendMessage: (content: string) => void;
  /** Raise your hand */
  raiseHand: () => void;
  /** Lower your hand */
  lowerHand: () => void;
  /** Start recording */
  startRecording: () => void;
  /** Stop recording (returns the Blob) */
  stopRecording: () => Promise<Blob>;
  /** Your local video+audio stream */
  localStream: MediaStream | null;
  /** All remote peer streams */
  remoteStreams: RemoteStream[];
  /** Map of all peers in the room */
  peers: Map<string, PeerInfo>;
  /** Chat messages */
  chatMessages: ChatMessage[];
  /** Current connection state */
  connectionState: ConnectionState;
  /** Whether you've joined a room */
  joined: boolean;
  /** Microphone state */
  isMicOn: boolean;
  /** Camera state */
  isCamOn: boolean;
  /** Screen sharing state */
  isScreenSharing: boolean;
  /** Recording state */
  isRecording: boolean;
  /** Hand raised state */
  isHandRaised: boolean;
  /** Active speaker userId */
  activeSpeaker: string | null;
  /** Network quality assessment */
  networkQuality: NetworkQuality | null;
  /** The underlying Room instance for advanced usage */
  room: Room | null;
}

export function useHiveRoom(config: HiveRTCConfig): UseHiveRoomReturn {
  const hiveRef = useRef<HiveRTC | null>(null);
  const roomRef = useRef<Room | null>(null);

  const [connectionState, setConnectionState] =
    useState<ConnectionState>('idle');
  const [joined, setJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [peers, setPeers] = useState<Map<string, PeerInfo>>(new Map());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [networkQuality, setNetworkQuality] =
    useState<NetworkQuality | null>(null);

  // Initialize HiveRTC instance
  useEffect(() => {
    hiveRef.current = new HiveRTC(config);
    return () => {
      hiveRef.current?.destroy();
    };
  }, [config.serverUrl]);

  const joinRoom = useCallback(
    async (roomId: string, options: JoinRoomOptions = {}) => {
      if (!hiveRef.current) return;

      try {
        const room = await hiveRef.current.joinRoom(roomId, options);
        roomRef.current = room;

        // Wire up all Room events → React state
        room.on('connectionStateChanged', setConnectionState);

        room.on('localStream', (stream) => {
          setLocalStream(stream);
          setJoined(true);
        });

        room.on('peerJoined', ({ peerId, userId, stream, kind }) => {
          setRemoteStreams((prev) => [
            ...prev,
            { peerId, userId, stream, kind },
          ]);
          setPeers(new Map(room.peers));
        });

        room.on('peerStreamAdded', ({ peerId, userId, stream, kind }) => {
          setRemoteStreams((prev) => [
            ...prev,
            { peerId, userId, stream, kind },
          ]);
          setPeers(new Map(room.peers));
        });

        room.on('peerStreamRemoved', ({ producerId }) => {
          setRemoteStreams((prev) =>
            prev.filter(
              (s) =>
                !Array.from(room.peers.values()).some((p) =>
                  p.streams.has(producerId),
                ),
            ),
          );
          setPeers(new Map(room.peers));
        });

        room.on('peerLeft', () => {
          setPeers(new Map(room.peers));
          // Remove streams for the departed peer
          setRemoteStreams((prev) => {
            const currentPeerIds = new Set(room.peers.keys());
            return prev.filter((s) => currentPeerIds.has(s.userId));
          });
        });

        room.on('chatMessage', (msg) => {
          setChatMessages((prev) => [...prev, msg]);
        });

        room.on('handRaised', ({ userId, raised }) => {
          setPeers(new Map(room.peers));
          // If it's our own hand raise
          if (userId === room.userId) {
            setIsHandRaised(raised);
          }
        });

        room.on('activeSpeaker', ({ userId }) => {
          setActiveSpeaker(userId);
        });

        room.on('networkQuality', (quality) => {
          setNetworkQuality(quality);
        });

        room.on('screenShareStarted', () => setIsScreenSharing(true));
        room.on('screenShareStopped', () => setIsScreenSharing(false));
        room.on('recordingStarted', () => setIsRecording(true));
        room.on('recordingStopped', () => setIsRecording(false));
      } catch (err) {
        console.error('[useHiveRoom] Join failed:', err);
        setConnectionState('error');
      }
    },
    [],
  );

  const leaveRoom = useCallback(() => {
    roomRef.current?.leave();
    roomRef.current = null;

    // Reset all state
    setJoined(false);
    setConnectionState('idle');
    setLocalStream(null);
    setRemoteStreams([]);
    setPeers(new Map());
    setChatMessages([]);
    setIsMicOn(true);
    setIsCamOn(true);
    setIsScreenSharing(false);
    setIsRecording(false);
    setIsHandRaised(false);
    setActiveSpeaker(null);
    setNetworkQuality(null);
  }, []);

  const toggleMic = useCallback(() => {
    roomRef.current?.toggleMic();
    setIsMicOn((prev) => !prev);
  }, []);

  const toggleCam = useCallback(() => {
    roomRef.current?.toggleCam();
    setIsCamOn((prev) => !prev);
  }, []);

  const shareScreen = useCallback(async () => {
    await roomRef.current?.shareScreen();
  }, []);

  const stopScreenShare = useCallback(() => {
    roomRef.current?.stopScreenShare();
  }, []);

  const sendMessage = useCallback((content: string) => {
    roomRef.current?.sendMessage(content);
  }, []);

  const raiseHand = useCallback(() => {
    roomRef.current?.raiseHand();
  }, []);

  const lowerHand = useCallback(() => {
    roomRef.current?.lowerHand();
  }, []);

  const startRecording = useCallback(() => {
    roomRef.current?.startRecording();
  }, []);

  const stopRecording = useCallback(async () => {
    return (await roomRef.current?.stopRecording()) ?? new Blob();
  }, []);

  // Cleanup on unmount
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
    shareScreen,
    stopScreenShare,
    sendMessage,
    raiseHand,
    lowerHand,
    startRecording,
    stopRecording,
    localStream,
    remoteStreams,
    peers,
    chatMessages,
    connectionState,
    joined,
    isMicOn,
    isCamOn,
    isScreenSharing,
    isRecording,
    isHandRaised,
    activeSpeaker,
    networkQuality,
    room: roomRef.current,
  };
}
