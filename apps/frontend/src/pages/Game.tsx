import { useEffect, useRef, useState, useMemo } from "react";
import { Users, Keyboard } from "lucide-react";
import { getSpace } from "../lib/api";

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState(new Map());
  const [params, setParams] = useState({ token: "", spaceId: "" });
  const [showInteractionButtons, setShowInteractionButtons] = useState(false);
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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pre-load images
  const loadedImages = useRef<Map<string, HTMLImageElement>>(new Map());
  useEffect(() => {
    spaceElements.forEach(el => {
      if (!loadedImages.current.has(el.element.imageUrl)) {
        const img = new Image();
        img.src = el.element.imageUrl;
        loadedImages.current.set(el.element.imageUrl, img);
      }
    });
  }, [spaceElements]);

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
          let someOneNearby = false;

          if (me && message.payload.userId === me.userId) {
            const updated = { ...me, x: message.payload.x, y: message.payload.y };
            setCurrentUser(updated);
            currentUserRef.current = updated;
          } else {
            const u = usersRef.current.get(message.payload.userId);
            usersRef.current.set(message.payload.userId, { ...u, x: message.payload.x, y: message.payload.y });
            setUsers(new Map(usersRef.current));
          }

          const livePos = currentUserRef.current;
          if (livePos) {
            usersRef.current.forEach((user: any) => {
              if ((Math.abs(user.x - livePos.x) <= 1 && Math.abs(user.y - livePos.y) <= 1)) {
                someOneNearby = true;
              }
            });
          }

          setShowInteractionButtons(someOneNearby);
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

  // ─── Dynamic Sizing Calculations ─────────────────────────────────
  // Calculate the perfect tile size so the whole map fits inside the window
  const computedMetrics = useMemo(() => {
    if (spaceDimensions.width === 0 || spaceDimensions.height === 0) {
      return { tileSize: 50, offsetX: 0, offsetY: 0, isScaled: false };
    }

    // Leave a 10% padding boundary around the edges of the screen
    const availableWidth = windowSize.width * 0.9;
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
    const offsetX = (windowSize.width - mapTotalWidth) / 2;
    // Push it down slightly because of the top HUD
    const offsetY = ((windowSize.height - mapTotalHeight) / 2) + 20;

    return {
      tileSize,
      offsetX,
      offsetY,
      // If scale is below certain threshold, hide dense UI elements (like name tags) to prevent clutter
      isHighDensity: tileSize < 30
    };
  }, [spaceDimensions, windowSize]);

  // ─── Render Loop ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const { tileSize, offsetX, offsetY, isHighDensity } = computedMetrics;

    const renderLoop = () => {
      // 1. Array smoothing logic (Lerp in Grid Units, not Absolute Pixels)
      if (currentUserRef.current) {
        currentUserRef.current.smoothX += (currentUserRef.current.x - currentUserRef.current.smoothX) * 0.3;
        currentUserRef.current.smoothY += (currentUserRef.current.y - currentUserRef.current.smoothY) * 0.3;
      }
      usersRef.current.forEach((u) => {
        if (u.smoothX === undefined) u.smoothX = u.x;
        if (u.smoothY === undefined) u.smoothY = u.y;
        u.smoothX += (u.x - u.smoothX) * 0.3;
        u.smoothY += (u.y - u.smoothY) * 0.3;
      });

      // 2. Clear Screen
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0f0f1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Translate to perfectly center the map
      ctx.translate(offsetX, offsetY);

      // Draw Map Boundary / Grid Floor
      if (spaceDimensions.width > 0) {
        ctx.fillStyle = "#161625";
        ctx.fillRect(0, 0, spaceDimensions.width * tileSize, spaceDimensions.height * tileSize);

        // Draw grid lines only if the map isn't insanely cramped (improves performance)
        if (!isHighDensity) {
          ctx.strokeStyle = "rgba(167, 139, 250, 0.08)";
          ctx.lineWidth = 1;
          for (let i = 0; i <= spaceDimensions.width; i++) {
            ctx.beginPath(); ctx.moveTo(i * tileSize, 0); ctx.lineTo(i * tileSize, spaceDimensions.height * tileSize); ctx.stroke();
          }
          for (let i = 0; i <= spaceDimensions.height; i++) {
            ctx.beginPath(); ctx.moveTo(0, i * tileSize); ctx.lineTo(spaceDimensions.width * tileSize, i * tileSize); ctx.stroke();
          }
        }

        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = windowSize.width > 1000 ? 3 : 1; // thicker border on large screens
        ctx.strokeRect(0, 0, spaceDimensions.width * tileSize, spaceDimensions.height * tileSize);
      }

      // Draw Elements
      spaceElements.forEach(item => {
        const img = loadedImages.current.get(item.element.imageUrl);
        const px = item.x * tileSize;
        const py = item.y * tileSize;
        const drawWidth = item.element.width * tileSize;
        const drawHeight = item.element.height * tileSize;

        if (img && img.complete) {
          ctx.drawImage(img, px, py, drawWidth, drawHeight);
        } else {
          ctx.fillStyle = item.element.static ? "#2a2a45" : "#1e1e30";
          ctx.fillRect(px, py, drawWidth, drawHeight);
          ctx.strokeStyle = "#4a4a6a";
          ctx.strokeRect(px, py, drawWidth, drawHeight);
        }
      });

      // Draw Avatars Function
      const drawAvatar = (user: any, isMe = false) => {
        if (!user || user.smoothX === undefined) return;

        // Convert smooth grid units into actual pixels based on current window scale
        const px = user.smoothX * tileSize + tileSize / 2;
        const py = user.smoothY * tileSize + tileSize / 2;

        // Dynamically scale down Avatar radius so it fits inside tiny blocks 
        // if zooming out for massive maps
        const radius = Math.min(18, tileSize * 0.4);

        ctx.shadowColor = isMe ? "#a78bfa" : "#4ade80";
        ctx.shadowBlur = isHighDensity ? 3 : 12;

        const grad = ctx.createRadialGradient(px - (radius * 0.3), py - (radius * 0.3), radius * 0.1, px, py, radius);
        if (isMe) { grad.addColorStop(0, "#c4b5fd"); grad.addColorStop(1, "#7c3aed"); }
        else { grad.addColorStop(0, "#86efac"); grad.addColorStop(1, "#16a34a"); }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = isMe ? "#ede9fe" : "#dcfce7";
        ctx.lineWidth = isHighDensity ? 1 : 2;
        ctx.stroke();

        // If map isn't completely incredibly zoomed out, draw nametags/emojis
        if (!isHighDensity) {
          ctx.font = `${Math.min(16, tileSize * 0.4)}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(isMe ? "🧑" : "👤", px, py);

          const label = isMe ? "You" : `User ${user.userId.slice(0, 6)}`;
          ctx.font = "bold 11px Inter, Arial";
          ctx.textBaseline = "alphabetic";
          const tw = ctx.measureText(label).width;
          const pad = 6;

          ctx.fillStyle = isMe ? "rgba(124, 58, 237, 0.85)" : "rgba(22, 163, 74, 0.85)";
          ctx.beginPath();
          ctx.roundRect(px - tw / 2 - pad, py + radius + 4, tw + pad * 2, 18, [6]);
          ctx.fill();

          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(label, px, py + radius + 17);
        }
      };

      usersRef.current.forEach((u) => drawAvatar(u, false));
      if (currentUserRef.current) drawAvatar(currentUserRef.current, true);

      ctx.restore();

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [spaceElements, spaceDimensions, computedMetrics, windowSize]);

  // ─── Keyboard movement ────────────────────────────────────────────
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

    let someoneNearby = false;
    usersRef.current.forEach(u => {
      if ((Math.abs(u.x - nx) <= 1 && Math.abs(u.y - ny) <= 1)) {
        someoneNearby = true;
      }
    });

    setShowInteractionButtons(someoneNearby);


    wsRef.current.send(JSON.stringify({ type: "move", payload: { x: nx, y: ny, userId: me.userId } }));
  };

  return (
    <div
      className="arena-root"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={wrapperRef}
      style={{ overflow: "hidden", position: "relative" }}
    >
      <div className="flex justify-between items-center w-full">
        <div className="arena-hud">
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

        <div className="bg-black w-100 ">
          {showInteractionButtons && (
            <div className="interaction-buttons">
              <button className="bg-blue-500 text-white px-4 py-2 rounded-lg">Video Call</button>
              <button className="bg-green-500 text-white px-4 py-2 rounded-lg">Text Chat</button>
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

      <canvas
        ref={canvasRef}
        width={windowSize.width}
        height={windowSize.height}
        style={{ display: "block", backgroundColor: "#0f0f1a" }}
      />

      <div className="arena-hint" style={{ position: "absolute", bottom: 20, right: 20, zIndex: 10 }}>
        <Keyboard size={16} />
        Use <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> arrow keys to move. Map fits to screen!
      </div>
    </div>
  );
};

export default Arena;
