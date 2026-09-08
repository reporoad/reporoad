import { env } from 'cloudflare:workers';
import { liveVideoResolver, youtubeConfigResponse } from '@/lib/youtube';

// One resolver per isolate keeps the Data API search inside its daily quota
// however many viewers are polling this endpoint.
const resolveLiveVideo = liveVideoResolver();

// Runtime bindings, never NEXT_PUBLIC_* or bundled into client JavaScript.
export function GET() {
  const runtime = env as unknown as { YOUTUBE_VIDEO_ID?: string; YOUTUBE_CHANNEL_ID?: string; YOUTUBE_API_KEY?: string };
  return youtubeConfigResponse(runtime.YOUTUBE_VIDEO_ID, runtime.YOUTUBE_CHANNEL_ID, runtime.YOUTUBE_API_KEY, resolveLiveVideo);
}
