import {env} from 'cloudflare:workers';
import {uploadMusic} from '@/lib/music-storage';
export async function PUT(request:Request) {
  const bindings=env as unknown as {MUSIC?:R2Bucket;MUSIC_UPLOAD_TOKEN?:string};
  return uploadMusic(request,bindings.MUSIC,bindings.MUSIC_UPLOAD_TOKEN);
}
export const HEAD=PUT;
