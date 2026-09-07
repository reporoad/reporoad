import { env } from 'cloudflare:workers';
import { youtubeConfigResponse } from '@/lib/youtube';

// Runtime binding, never NEXT_PUBLIC_* or bundled into client JavaScript.
export function GET() {
  return youtubeConfigResponse((env as unknown as { YOUTUBE_VIDEO_ID?: string }).YOUTUBE_VIDEO_ID);
}
