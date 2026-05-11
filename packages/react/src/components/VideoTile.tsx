// ═══════════════════════════════════════════════════════════════
// @hivertc/react — VideoTile Component
// Pre-built component that auto-attaches a MediaStream to a
// <video> element with proper lifecycle management.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';

export interface VideoTileProps {
  /** The MediaStream to render */
  stream: MediaStream;
  /** Mute audio (set true for local preview to avoid echo) */
  muted?: boolean;
  /** Mirror the video (set true for local/selfie view) */
  mirror?: boolean;
  /** CSS class name for the <video> element */
  className?: string;
  /** CSS styles for the <video> element */
  style?: React.CSSProperties;
  /** User label to overlay on the tile */
  label?: string;
  /** Show label overlay */
  showLabel?: boolean;
}

/**
 * A pre-built video tile that auto-attaches a MediaStream.
 *
 * @example
 * ```tsx
 * <VideoTile stream={localStream} muted mirror label="You" />
 * ```
 */
export function VideoTile({
  stream,
  muted = false,
  mirror = false,
  className = '',
  style,
  label,
  showLabel = true,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    aspectRatio: '16/9',
    overflow: 'hidden',
    borderRadius: '12px',
    backgroundColor: '#0a0f1c',
    ...style,
  };

  const videoStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: mirror ? 'scaleX(-1)' : undefined,
  };

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '8px',
    left: '8px',
    padding: '4px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    zIndex: 10,
  };

  return (
    <div style={containerStyle} className={className}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        style={videoStyle}
      />
      {showLabel && label && <div style={labelStyle}>{label}</div>}
    </div>
  );
}
