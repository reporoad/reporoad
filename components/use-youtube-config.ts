'use client';
import { useEffect, useState } from 'react';

// One shared value in the page keeps the video, chat and external links in sync.
export function useYouTubeConfig(enabled: boolean) {
  const [videoId, setVideoId] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    async function refresh() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch('/api/broadcast-config', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw Error('Configuration unavailable');
        const data = await response.json() as { videoId?: unknown };
        if (typeof data.videoId !== 'string' || !/^[\w-]{11}$/.test(data.videoId)) throw Error('Invalid video ID');
        if (!stopped) setVideoId(data.videoId);
      } catch { /* Keep the last working broadcast during transient failures. */ }
      finally {
        clearTimeout(timeout);
        if (!stopped) timer = setTimeout(refresh, 30000);
      }
    }
    void refresh();
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); };
  }, [enabled]);
  return videoId;
}
