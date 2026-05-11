// ═══════════════════════════════════════════════════════
// PART 4 — PeerVideoTile component
// Renders a single proximity-driven video stream.
// Audio is MUTED here — it comes from the PannerNode graph.
// ═══════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';

interface Props {
  userId: string;
  track: MediaStreamTrack;
}

export function PeerVideoTile({ userId, track }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = new MediaStream([track]);
    videoRef.current.muted = true; // CRITICAL: audio comes from PannerNode, not the element
    videoRef.current.play().catch(() => {});
  }, [track]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: 160,
          height: 120,
          borderRadius: 8,
          background: '#000',
        }}
      />
      <span
        style={{
          position: 'absolute',
          bottom: 4,
          left: 6,
          fontSize: 11,
          color: '#fff',
          background: 'rgba(0,0,0,0.5)',
          padding: '1px 5px',
          borderRadius: 4,
        }}
      >
        {userId.slice(0, 8)}
      </span>
    </div>
  );
}
