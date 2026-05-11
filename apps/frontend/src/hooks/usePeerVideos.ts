// ═══════════════════════════════════════════════════════
// PART 4 — React hook for proximity-driven video overlays.
// Listens to custom events dispatched by ProximityManager
// and manages a Map of active video tracks for the UI.
// ═══════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

/**
 * Tracks which remote peers currently have active video streams
 * within the R_VIDEO proximity zone.
 */
export function usePeerVideos() {
  const [videoMap, setVideoMap] = useState<Map<string, MediaStreamTrack>>(
    new Map()
  );

  useEffect(() => {
    function onReady(e: Event) {
      const { userId, track } = (e as CustomEvent).detail;
      setVideoMap((prev) => new Map(prev).set(userId, track));
    }
    function onRemoved(e: Event) {
      const { userId } = (e as CustomEvent).detail;
      setVideoMap((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    }

    window.addEventListener('hive:videoReady', onReady);
    window.addEventListener('hive:videoRemoved', onRemoved);

    return () => {
      window.removeEventListener('hive:videoReady', onReady);
      window.removeEventListener('hive:videoRemoved', onRemoved);
    };
  }, []);

  return videoMap;
}
