// Fallbacks only. The active broadcast is read from the server's runtime configuration.
export const YOUTUBE_VIDEO_ID = 'WuLbv_j9CGE';
export const YOUTUBE_CHANNEL_ID = 'UCV6R_O0gxuj2tNcQWq7yJ3g';
export const YOUTUBE_WATCH_URL = `https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}`;

const VIDEO_ID = /^[\w-]{11}$/, CHANNEL_ID = /^UC[\w-]{22}$/;
export type BroadcastConfig = { videoId: string; channelId: string };

export function youtubeRuntimeConfig(value?: string, channel?: string): BroadcastConfig {
  const videoId = value?.trim() || YOUTUBE_VIDEO_ID;
  if (!VIDEO_ID.test(videoId)) throw Error('YOUTUBE_VIDEO_ID must be an 11-character public YouTube video ID');
  const channelId = channel?.trim() || YOUTUBE_CHANNEL_ID;
  if (!CHANNEL_ID.test(channelId)) throw Error('YOUTUBE_CHANNEL_ID must be a UC… channel ID');
  return { videoId, channelId };
}

// Live chat can only be embedded for one concrete video, so the active broadcast
// has to be looked up. A search costs 100 quota units against a 10,000/day budget
// while every viewer re-reads the configuration twice a minute: cache the answer
// rather than spending the day's quota in the first few minutes.
export function liveVideoResolver(request: typeof fetch = fetch, ttlMs = 60000, now: () => number = Date.now) {
  let cached: { videoId: string; at: number } | undefined;
  return async (channelId: string, apiKey: string) => {
    if (cached && now() - cached.at < ttlMs) return cached.videoId;
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.search = new URLSearchParams({ part: 'snippet', channelId, eventType: 'live', type: 'video', maxResults: '1', key: apiKey }).toString();
    const response = await request(url.href, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw Error('YouTube broadcast lookup failed');
    const data = await response.json() as { items?: { id?: { videoId?: unknown } }[] };
    const videoId = data.items?.[0]?.id?.videoId;
    if (typeof videoId !== 'string' || !VIDEO_ID.test(videoId)) throw Error('No live broadcast found');
    cached = { videoId, at: now() };
    return videoId;
  };
}

export async function youtubeConfigResponse(
  value?: string, channel?: string, apiKey?: string,
  resolve?: (channelId: string, apiKey: string) => Promise<string>,
) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const config = youtubeRuntimeConfig(value, channel);
    // Discovery only sharpens the chat tab; the player follows the channel either
    // way, so a lookup failure must not take the configuration down with it.
    if (apiKey && resolve) {
      try { config.videoId = await resolve(config.channelId, apiKey); } catch { /* Keep the configured broadcast. */ }
    }
    return Response.json(config, { headers });
  }
  catch { return Response.json({ error: 'Broadcast configuration unavailable' }, { status: 503, headers }); }
}

export function youtubeEmbedUrls(hostname: string, config: BroadcastConfig = { videoId: YOUTUBE_VIDEO_ID, channelId: YOUTUBE_CHANNEL_ID }) {
  const { videoId, channelId } = config;
  if (!VIDEO_ID.test(videoId)) throw Error('Invalid YouTube video ID');
  if (!CHANNEL_ID.test(channelId)) throw Error('Invalid YouTube channel ID');
  if (!/^[a-z0-9.-]+$/i.test(hostname)) throw Error('Invalid embedding hostname');
  // Following the channel keeps the player on the current broadcast, so a
  // broadcaster restart no longer strands viewers on an ended stream.
  const player = new URL('https://www.youtube.com/embed/live_stream');
  player.search = new URLSearchParams({ channel: channelId, autoplay: '1', mute: '1', playsinline: '1', controls: '1' }).toString();
  const chat = new URL('https://www.youtube.com/live_chat');
  chat.search = new URLSearchParams({ v: videoId, embed_domain: hostname, dark_theme: '1' }).toString();
  return { player: player.href, chat: chat.href, watch: `https://www.youtube.com/watch?v=${videoId}` };
}

export function usesRenderedWorld(search: string, broadcast: boolean) {
  const params = new URLSearchParams(search);
  return broadcast || params.get('preview') === '1' || params.get('supportPreview') === '1';
}
