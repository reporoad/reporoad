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
// has to be resolved. YouTube's own channel live page redirects to whatever is
// live and names it in its canonical link, which needs no API key, cloud project
// or quota. It reads undocumented markup, so callers must treat a failure as
// ordinary and keep their configured fallback.
const LOOKUP_TIMEOUT_MS = 10000;

export async function findLiveVideo(channelId: string, request: typeof fetch = fetch) {
  if (!CHANNEL_ID.test(channelId)) throw Error('Invalid YouTube channel ID');
  const response = await request(`https://www.youtube.com/channel/${channelId}/live`, {
    redirect: 'follow',
    headers: { 'Accept-Language': 'en' },
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  });
  if (!response.ok) throw Error('YouTube broadcast lookup failed');
  // An offline channel keeps its own page as the canonical URL, so requiring a
  // watch link is also the liveness test.
  const canonical = /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/.exec(await response.text());
  if (!canonical) throw Error('No live broadcast found');
  return canonical[1];
}

export function liveVideoResolver(request: typeof fetch = fetch, ttlMs = 300000, now: () => number = Date.now) {
  let cached: { videoId?: string; at: number } | undefined;
  return async (channelId: string) => {
    // Failures are cached too, for a fifth as long: a lookup that starts failing
    // must not turn every viewer's poll into a request to YouTube.
    if (cached && now() - cached.at < (cached.videoId ? ttlMs : ttlMs / 5)) {
      if (cached.videoId) return cached.videoId;
      throw Error('No live broadcast found');
    }
    try {
      const videoId = await findLiveVideo(channelId, request);
      cached = { videoId, at: now() };
      return videoId;
    }
    catch (error) { cached = { at: now() }; throw error; }
  };
}

export async function youtubeConfigResponse(
  value?: string, channel?: string,
  resolve?: (channelId: string) => Promise<string>,
) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const config = youtubeRuntimeConfig(value, channel);
    // Discovery only sharpens the chat tab; the player follows the channel either
    // way, so a lookup failure must not take the configuration down with it.
    if (resolve) {
      try { config.videoId = await resolve(config.channelId); } catch { /* Keep the configured broadcast. */ }
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
