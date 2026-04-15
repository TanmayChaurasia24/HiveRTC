import { useEffect, useRef } from "react";

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

interface ArenaCanvasProps {
  computedMetrics: {
    tileSize: number;
    offsetX: number;
    offsetY: number;
    isHighDensity: boolean;
    canvasWidth: number;
  };
  spaceElements: SpaceElement[];
  spaceDimensions: { width: number; height: number };
  usersRef: React.MutableRefObject<Map<string, any>>;
  currentUserRef: React.MutableRefObject<any>;
  windowSize: { width: number; height: number };
}

export const ArenaCanvas = ({
  computedMetrics,
  spaceElements,
  spaceDimensions,
  usersRef,
  currentUserRef,
  windowSize,
}: ArenaCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImages = useRef<Map<string, HTMLImageElement>>(new Map());

  // Pre-load images tightly scoped to the canvas
  useEffect(() => {
    spaceElements.forEach(el => {
      if (!loadedImages.current.has(el.element.imageUrl)) {
        const img = new Image();
        img.src = el.element.imageUrl;
        loadedImages.current.set(el.element.imageUrl, img);
      }
    });
  }, [spaceElements]);

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
      ctx.translate(offsetX, offsetY);

      // Draw Map Boundary / Grid Floor
      if (spaceDimensions.width > 0) {
        ctx.fillStyle = "#161625";
        ctx.fillRect(0, 0, spaceDimensions.width * tileSize, spaceDimensions.height * tileSize);

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
        ctx.lineWidth = windowSize.width > 1000 ? 3 : 1;
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

        const px = user.smoothX * tileSize + tileSize / 2;
        const py = user.smoothY * tileSize + tileSize / 2;
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

  return (
    <canvas
      ref={canvasRef}
      width={computedMetrics.canvasWidth}
      height={windowSize.height}
      style={{ display: "block", backgroundColor: "#0f0f1a", flexShrink: 0 }}
    />
  );
};
