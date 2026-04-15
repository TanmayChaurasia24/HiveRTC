import { useEffect, useRef, useState, useMemo } from "react";
import { Users, Keyboard } from "lucide-react";
import { getSpace } from "../lib/api";
import { ArenaCanvas } from "../components/ArenaCanvas";
import { SFUSidebar } from "../components/SFUSidebar";
import { useSFU } from "@/hooks/useSFU";

type SpaceElement = {
  id: string;
  x: number;
  y: number;
  element: {
    id: string;
    imageUrl: string;
    width: number;
    height: number;
    static: boolean;
  };
};

const Arena = () => {
  const {
    joinRoom,
    leaveRoom,
    toggleCam,
    toggleMic,
    isMicOn,
    isCamOn,
    joined,
    connectionState,
    localStream,
    remoteMedia,
  } = useSFU();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState(new Map());
  const [params, setParams] = useState({ token: "", spaceId: "" });
  const [showInteractionButtons, setShowInteractionButtons] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "error">("connecting");

  // Canvas size state for full-screen effect
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Elements state
  const [spaceElements, setSpaceElements] = useState<SpaceElement[]>([]);
  const [spaceDimensions, setSpaceDimensions] = useState({ width: 0, height: 0 });

  // Refs to avoid stale closures in WS callbacks
  const currentUserRef = useRef<any>(null);
  const usersRef = useRef<Map<string, any>>(new Map());

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { usersRef.current = users; }, [users]);

  // Handle absolute strict proximity recalculation & auto-disconnection
  useEffect(() => {
    const me = currentUserRef.current;
    if (!me) return;

    let someOneNearby = false;
    usersRef.current.forEach((user: any) => {
      if (Math.abs(user.x - me.x) <= 1 && Math.abs(user.y - me.y) <= 1) {
        someOneNearby = true;
      }
    });

    setShowInteractionButtons(someOneNearby);

    // If suddenly stranded alone directly during a call (everyone else walked away or you walked away)
    if (!someOneNearby && inCall) {
      leaveRoom();
      setInCall(false);
    }
  }, [currentUser, users, inCall, leaveRoom]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Image preloading logic moved to ArenaCanvas component

  // ─── Fetch Space Data ────────────────────────────────────────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const spaceId = urlParams.get("spaceId");
    if (!spaceId) return;

    getSpace(spaceId).then((data) => {
      setSpaceElements(data.elements || []);
      if (data.dimensions) {
        const [w, h] = data.dimensions.split("x").map(Number);
        setSpaceDimensions({ width: w, height: h });
      }
    }).catch(err => console.error("Failed to load space elements:", err));
  }, []);

  // ─── WebSocket setup ─────────────────────────────────────────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token") || "";
    const spaceId = urlParams.get("spaceId") || "";
    setParams({ token, spaceId });

    if (!spaceId || !token) { setWsStatus("error"); return; }

    const ws = new WebSocket("ws://localhost:3001");
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
      ws.send(JSON.stringify({ type: "join", payload: { spaceId, token } }));
    };

    ws.onerror = () => setWsStatus("error");
    ws.onclose = () => setWsStatus("error");

    ws.onmessage = async (event: MessageEvent) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "space-joined": {
          const me = {
            x: message.payload.spawn.x,
            y: message.payload.spawn.y,
            userId: message.payload.userId,
            smoothX: message.payload.spawn.x, // track grid coordinates for lerp
            smoothY: message.payload.spawn.y,
          };
          setCurrentUser(me);
          currentUserRef.current = me;

          const userMap = new Map<string, any>();
          message.payload.users.forEach((u: any) => {
            userMap.set(u.userId, { ...u, smoothX: u.x, smoothY: u.y });
          });
          setUsers(userMap);
          usersRef.current = userMap;
          break;
        }

        case "user-joined": {
          setUsers((prev) => {
            const next = new Map(prev);
            next.set(message.payload.userId, {
              x: message.payload.x,
              y: message.payload.y,
              userId: message.payload.userId,
              smoothX: message.payload.x,
              smoothY: message.payload.y,
            });
            usersRef.current = next;
            return next;
          });
          break;
        }

        case "movement": {
          const me = currentUserRef.current;

          if (me && message.payload.userId === me.userId) {
            const updated = { ...me, x: message.payload.x, y: message.payload.y };
            setCurrentUser(updated);
            currentUserRef.current = updated;
          } else {
            const u = usersRef.current.get(message.payload.userId);
            usersRef.current.set(message.payload.userId, { ...u, x: message.payload.x, y: message.payload.y });
            setUsers(new Map(usersRef.current));
          }
          break;
        }

        case "movement-rejected": {
          setCurrentUser((prev: any) => {
            const updated = { ...prev, x: message.payload.x, y: message.payload.y };
            currentUserRef.current = updated;
            return updated;
          });
          break;
        }

        case "user-left": {
          setUsers((prev) => {
            const next = new Map(prev);
            next.delete(message.payload.userId);
            usersRef.current = next;
            return next;
          });
          break;
        }
      }
    };
    return () => ws.close();
  }, []);


  const computedMetrics = useMemo(() => {
    // Canvas takes 70% of screen if in a call, 100% otherwise
    const canvasWidth = inCall ? windowSize.width * 0.7 : windowSize.width;

    if (spaceDimensions.width === 0 || spaceDimensions.height === 0) {
      return { tileSize: 50, offsetX: 0, offsetY: 0, isScaled: false, canvasWidth };
    }

    // Leave a 10% padding boundary around the edges of the screen
    const availableWidth = canvasWidth * 0.9;
    const availableHeight = windowSize.height * 0.8; // leave room for HUD at top

    const tileW = availableWidth / spaceDimensions.width;
    const tileH = availableHeight / spaceDimensions.height;

    // Choose the smallest to ensure absolute fit on screen
    let tileSize = Math.min(tileW, tileH);

    // Don't let tiles get cartoonishly gigantic on small 2x2 maps
    tileSize = Math.min(Math.floor(tileSize), 80);

    const mapTotalWidth = spaceDimensions.width * tileSize;
    const mapTotalHeight = spaceDimensions.height * tileSize;

    // Exact center alignment coordinates
    const offsetX = (canvasWidth - mapTotalWidth) / 2;
    // Push it down slightly because of the top HUD
    const offsetY = ((windowSize.height - mapTotalHeight) / 2) + 20;

    return {
      tileSize,
      offsetX,
      offsetY,
      // If scale is below certain threshold, hide dense UI elements (like name tags) to prevent clutter
      isHighDensity: tileSize < 30,
      canvasWidth
    };
  }, [spaceDimensions, windowSize, inCall]);



  const handleKeyDown = (e: React.KeyboardEvent) => {
    const me = currentUserRef.current;
    if (!me || wsRef.current?.readyState !== WebSocket.OPEN) return;

    const { x, y } = me;
    let nx = x, ny = y;

    switch (e.key) {
      case "ArrowUp": ny = y - 1; break;
      case "ArrowDown": ny = y + 1; break;
      case "ArrowLeft": nx = x - 1; break;
      case "ArrowRight": nx = x + 1; break;
      default: return;
    }

    e.preventDefault();

    // Bounds check
    if (spaceDimensions.width > 0) {
      if (nx < 0 || ny < 0 || nx >= spaceDimensions.width || ny >= spaceDimensions.height) {
        return;
      }
    }

    // Static element collision
    const collision = spaceElements.find(el => {
      if (!el.element.static) return false;
      return (nx >= el.x && nx < el.x + el.element.width && ny >= el.y && ny < el.y + el.element.height);
    });
    if (collision) return;

    const optimistic = { ...me, x: nx, y: ny };
    setCurrentUser(optimistic);
    currentUserRef.current = optimistic;

    wsRef.current.send(JSON.stringify({ type: "move", payload: { x: nx, y: ny, userId: me.userId } }));
  };

  const handleJoinCall = (spaceId: string) => {
    setInCall(true);
    if (spaceId.trim()) {
      joinRoom(spaceId.trim());
    }

  };

  return (
    <div
      className="arena-root"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={wrapperRef}
      style={{ overflow: "hidden", position: "relative" }}
    >
      <div className="flex justify-between items-center w-full relative z-[50] pointer-events-none">
        <div className="arena-hud pointer-events-auto">
          <div className="arena-title">
            <span>🐝</span> HiveRTC Arena
          </div>
          <div className="arena-hud-right">
            <div className={`ws-badge ${wsStatus}`}>
              {wsStatus === "connected" ? "● Live" : wsStatus === "error" ? "✕ Error" : "○ Connecting"}
            </div>
            <div className="arena-users">
              <Users size={16} />
              <span>{users.size + (currentUser ? 1 : 0)}</span>
            </div>
            <div className="arena-space-id">
              Space: <strong>{params.spaceId.slice(0, 16)}...</strong>
            </div>
          </div>
        </div>

        <div className="bg-black w-100 pointer-events-auto">
          {showInteractionButtons && !inCall && (
            <div className="interaction-buttons">
              <button
                className="bg-blue-500 hover:bg-blue-600 transition-colors text-white font-medium px-6 py-2 rounded-lg shadow-lg cursor-pointer"
                onClick={() => handleJoinCall(params.spaceId)}
              >
                Join Call
              </button>
            </div>
          )}
        </div>
      </div>

      {wsStatus === "connecting" && (
        <div className="arena-overlay" style={{ zIndex: 20 }}>
          <div className="loader-spinner" />
          <p>Joining space...</p>
        </div>
      )}
      {wsStatus === "error" && (
        <div className="arena-overlay" style={{ zIndex: 20 }}>
          <p style={{ color: "#f87171" }}>⚠️ Could not connect to WebSocket server</p>
          <p style={{ fontSize: "0.8rem", color: "#6b6b8a" }}>Make sure ws://localhost:3001 is running</p>
        </div>
      )}

      <div className="flex flex-row justify-between items-stretch absolute top-0 left-0 w-full h-full z-0">
        <ArenaCanvas
          computedMetrics={computedMetrics as any}
          spaceElements={spaceElements}
          spaceDimensions={spaceDimensions}
          usersRef={usersRef}
          currentUserRef={currentUserRef}
          windowSize={windowSize}
        />

        {inCall && (
          <SFUSidebar
            spaceId={params.spaceId}
            onLeave={() => { leaveRoom(); setInCall(false); }}
            toggleCam={toggleCam}
            toggleMic={toggleMic}
            isMicOn={isMicOn}
            isCamOn={isCamOn}
            joined={joined}
            connectionState={connectionState}
            localStream={localStream}
            remoteMedia={remoteMedia}
          />
        )}
      </div>
    </div>
  );
};

export default Arena;
