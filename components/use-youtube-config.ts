'use client';
import { useEffect, useState } from 'react';
import type { BroadcastConfig } from '@/lib/youtube';

// One shared value in the page keeps the player, chat and external links in sync.
export function useYouTubeConfig(enabled: boolean) {
  const [config, setConfig] = useState<BroadcastConfig | null>(null);
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
        const data = await response.json() as { videoId?: unknown; channelId?: unknown };
        if (typeof data.videoId !== 'string' || !/^[\w-]{11}$/.test(data.videoId)) throw Error('Invalid video ID');
        if (typeof data.channelId !== 'string' || !/^UC[\w-]{22}$/.test(data.channelId)) throw Error('Invalid channel ID');
        if (!stopped) setConfig({ videoId: data.videoId, channelId: data.channelId });
      } catch { /* Keep the last working broadcast during transient failures. */ }
      finally {
        clearTimeout(timeout);
        if (!stopped) timer = setTimeout(refresh, 30000);
      }
    }
    void refresh();
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); };
  }, [enabled]);
  return config;
}
