import { env } from 'cloudflare:workers';
import { liveVideoResolver, youtubeConfigResponse } from '@/lib/youtube';

// One resolver per isolate: viewers poll this endpoint twice a minute, and the
// lookup behind it must not be repeated for each of them.
const resolveLiveVideo = liveVideoResolver();

// Runtime bindings, never NEXT_PUBLIC_* or bundled into client JavaScript.
export function GET() {
  const runtime = env as unknown as { YOUTUBE_VIDEO_ID?: string; YOUTUBE_CHANNEL_ID?: string };
  return youtubeConfigResponse(runtime.YOUTUBE_VIDEO_ID, runtime.YOUTUBE_CHANNEL_ID, resolveLiveVideo);
}
