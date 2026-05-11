import { useRef, useEffect, useCallback, useState } from "react";

// ── Types ──
interface PeerPosition {
  userId: string;
  x: number;
  y: number;
  color: string;
}

interface SpatialCanvasProps {
  localPosition: { x: number; y: number };
  peers: PeerPosition[];
  onPositionChange: (pos: { x: number; y: number }) => void;
  audioRadius?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

// ── Color palette for peers ──
const PEER_COLORS = [
  "#22d3ee", "#a78bfa", "#f472b6", "#34d399",
  "#fbbf24", "#f87171", "#60a5fa", "#c084fc",
];

export function SpatialCanvas({
  localPosition,
  peers,
  onPositionChange,
  audioRadius = 250,
  canvasWidth = 700,
  canvasHeight = 500,
}: SpatialCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const animFrameRef = useRef<number>(0);
  const [hovered, setHovered] = useState(false);

  // ── Distance helper ──
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  // ── Draw loop ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const W = canvasWidth;
    const H = canvasHeight;

    // HiDPI scaling
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const t = Date.now() / 1000;

    // ── Background ──
    const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W);
    bg.addColorStop(0, "#0f1729");
    bg.addColorStop(1, "#060a14");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── Dot grid ──
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let x = 0; x < W; x += 30) {
      for (let y = 0; y < H; y += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const lx = localPosition.x;
    const ly = localPosition.y;

    // ── Audio Radius (outer ring — animated dashes) ──
    ctx.save();
    ctx.strokeStyle = "rgba(99, 102, 241, 0.15)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.lineDashOffset = -t * 30;
    ctx.beginPath();
    ctx.arc(lx, ly, audioRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Filled radius zone
    const rGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, audioRadius);
    rGrad.addColorStop(0, "rgba(99, 102, 241, 0.06)");
    rGrad.addColorStop(0.7, "rgba(99, 102, 241, 0.03)");
    rGrad.addColorStop(1, "rgba(99, 102, 241, 0)");
    ctx.fillStyle = rGrad;
    ctx.beginPath();
    ctx.arc(lx, ly, audioRadius, 0, Math.PI * 2);
    ctx.fill();

    // ── Connection lines + distance labels ──
    peers.forEach((peer) => {
      const d = dist(localPosition, peer);
      const inRange = d <= audioRadius;
      const alpha = inRange ? Math.max(0.1, 1 - d / audioRadius) : 0.05;

      // Gradient line
      const lineGrad = ctx.createLinearGradient(lx, ly, peer.x, peer.y);
      lineGrad.addColorStop(0, `rgba(99, 102, 241, ${alpha})`);
      lineGrad.addColorStop(1, `${peer.color}${Math.round(alpha * 80).toString(16).padStart(2, "0")}`);

      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = inRange ? 2 : 0.5;
      ctx.setLineDash(inRange ? [] : [4, 6]);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(peer.x, peer.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Distance label at midpoint
      const mx = (lx + peer.x) / 2;
      const my = (ly + peer.y) / 2;
      ctx.font = "bold 11px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = inRange ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)";
      ctx.fillText(`${Math.round(d)}px`, mx, my - 6);

      // Volume percentage
      if (inRange) {
        const vol = Math.round((1 - d / audioRadius) * 100);
        ctx.fillStyle = "rgba(52, 211, 153, 0.8)";
        ctx.fillText(`🔊 ${vol}%`, mx, my + 8);
      }
    });

    // ── Remote peer circles ──
    peers.forEach((peer) => {
      const d = dist(localPosition, peer);
      const inRange = d <= audioRadius;

      // Glow
      if (inRange) {
        const glow = ctx.createRadialGradient(peer.x, peer.y, 0, peer.x, peer.y, 40);
        glow.addColorStop(0, peer.color + "40");
        glow.addColorStop(1, peer.color + "00");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(peer.x, peer.y, 40, 0, Math.PI * 2);
        ctx.fill();
      }

      // Volume arc ring (shows relative volume)
      if (inRange) {
        const vol = 1 - d / audioRadius;
        ctx.strokeStyle = peer.color;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(peer.x, peer.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * vol);
        ctx.stroke();
        ctx.lineCap = "butt";
      }

      // Circle
      ctx.fillStyle = inRange ? peer.color : peer.color + "60";
      ctx.beginPath();
      ctx.arc(peer.x, peer.y, 16, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.font = "bold 12px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = inRange ? "#fff" : "rgba(255,255,255,0.4)";
      ctx.fillText(peer.userId.slice(0, 8), peer.x, peer.y + 34);

      // Status text
      ctx.font = "10px Inter, system-ui, sans-serif";
      ctx.fillStyle = inRange ? "#34d399" : "#ef4444";
      ctx.fillText(inRange ? "In Range" : "Out of Range", peer.x, peer.y + 47);
    });

    // ── Local user circle (YOU) ──
    // Outer pulse ring
    const pulseSize = 28 + Math.sin(t * 3) * 4;
    ctx.strokeStyle = "rgba(129, 140, 248, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lx, ly, pulseSize, 0, Math.PI * 2);
    ctx.stroke();

    // Glow
    const localGlow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 50);
    localGlow.addColorStop(0, "rgba(99, 102, 241, 0.3)");
    localGlow.addColorStop(1, "rgba(99, 102, 241, 0)");
    ctx.fillStyle = localGlow;
    ctx.beginPath();
    ctx.arc(lx, ly, 50, 0, Math.PI * 2);
    ctx.fill();

    // Circle
    const grad = ctx.createRadialGradient(lx - 4, ly - 4, 0, lx, ly, 20);
    grad.addColorStop(0, "#818cf8");
    grad.addColorStop(1, "#4f46e5");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lx, ly, 20, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // "YOU" text inside
    ctx.font = "bold 10px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText("YOU", lx, ly);
    ctx.textBaseline = "alphabetic";

    // Label
    ctx.font = "bold 12px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#c7d2fe";
    ctx.fillText("Drag to move", lx, ly + 38);

    // ── Legend (bottom left) ──
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";

    ctx.fillStyle = "rgba(99, 102, 241, 0.4)";
    ctx.beginPath();
    ctx.arc(20, H - 50, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText(`Audio radius: ${audioRadius}px`, 32, H - 46);

    ctx.fillStyle = "#34d399";
    ctx.beginPath();
    ctx.arc(20, H - 30, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("In range = spatial audio active", 32, H - 26);

    // ── Title ──
    ctx.font = "bold 14px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("🎧 3D Spatial Audio Map", 16, 28);

    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("HRTF-based positional audio • Web Audio API", 16, 46);

    animFrameRef.current = requestAnimationFrame(draw);
  }, [localPosition, peers, audioRadius, canvasWidth, canvasHeight]);

  // ── Animation loop ──
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  // ── Mouse / Touch drag ──
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0]!.clientY : e.clientY;
    return {
      x: Math.max(20, Math.min(canvasWidth - 20, clientX - rect.left)),
      y: Math.max(20, Math.min(canvasHeight - 20, clientY - rect.top)),
    };
  };

  const handleDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    const d = Math.sqrt(
      (pos.x - localPosition.x) ** 2 + (pos.y - localPosition.y) ** 2,
    );
    if (d < 30) {
      dragging.current = true;
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging.current) return;
    e.preventDefault();
    onPositionChange(getPos(e));
  };

  const handleUp = () => {
    dragging.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleDown}
      onMouseMove={handleMove}
      onMouseUp={handleUp}
      onMouseLeave={handleUp}
      onTouchStart={handleDown}
      onTouchMove={handleMove}
      onTouchEnd={handleUp}
      onMouseEnter={() => setHovered(true)}
      style={{
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.08)",
        cursor: hovered ? "grab" : "default",
        touchAction: "none",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    />
  );
}
