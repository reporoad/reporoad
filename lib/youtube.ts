// Public watch ID, not an ingest URL or stream key. Update when a new broadcast
// is created, until owner-authorized active-broadcast discovery is connected.
export const YOUTUBE_VIDEO_ID = 'WuLbv_j9CGE';
export const YOUTUBE_WATCH_URL = `https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}`;

export function youtubeEmbedUrls(hostname: string, videoId = YOUTUBE_VIDEO_ID) {
  if (!/^[\w-]{11}$/.test(videoId)) throw Error('Invalid YouTube video ID');
  if (!/^[a-z0-9.-]+$/i.test(hostname)) throw Error('Invalid embedding hostname');
  const player = new URL(`https://www.youtube.com/embed/${videoId}`);
  player.search = new URLSearchParams({ autoplay: '1', mute: '1', playsinline: '1', controls: '1' }).toString();
  const chat = new URL('https://www.youtube.com/live_chat');
  chat.search = new URLSearchParams({ v: videoId, embed_domain: hostname, dark_theme: '1' }).toString();
  return { player: player.href, chat: chat.href };
}

export function usesRenderedWorld(search: string, broadcast: boolean) {
  const params = new URLSearchParams(search);
  return broadcast || params.get('preview') === '1' || params.get('supportPreview') === '1';
}
