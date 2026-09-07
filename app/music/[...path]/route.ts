import {env} from 'cloudflare:workers';
import {readMusic} from '@/lib/music-storage';
export async function GET(request:Request) {
  let key:string;
  try{key=decodeURIComponent(new URL(request.url).pathname.slice('/music/'.length));}catch{return new Response('Invalid path',{status:400})}
  return readMusic(request,(env as unknown as {MUSIC?:R2Bucket}).MUSIC,key);
}
export const HEAD=GET;
