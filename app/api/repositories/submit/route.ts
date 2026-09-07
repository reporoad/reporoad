import { env } from 'cloudflare:workers';
import { database } from '@/lib/db';
import { RegistrationError, repositoryName, saveRegistration, verifyRepository } from '@/lib/road-registration';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
export async function POST(request: Request) {
  const reply = (error: string, status: number) => Response.json({error}, {status, headers});
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply('Submit from RepoRoad.',403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply('Expected JSON.',415);
  let name: string | null;
  try {
    const reader=request.body?.getReader(); if(!reader) return reply('Missing repository.',400);
    let raw=''; const decoder=new TextDecoder(); let size=0;
    try { for (;;) { const {done,value}=await reader.read(); if(done)break; size+=value.length; if(size>512)return reply('Request too large.',413); raw+=decoder.decode(value,{stream:true}); } raw+=decoder.decode(); }
    finally { await reader.cancel(); }
    name=repositoryName(JSON.parse(raw)?.repository);
  } catch { return reply('Enter a GitHub URL or owner/repo.',400); }
  if(!name)return reply('Enter a GitHub URL or owner/repo.',400);
  const ip=request.headers.get('cf-connecting-ip') || (import.meta.env.DEV ? 'local-dev' : null);
  if(!ip)return reply('Visitor verification unavailable.',503);
  try {
    const now=Date.now(), db=database();
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${Math.floor(now/86400000)}:${ip}`));
    const id=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
    await db.prepare('DELETE FROM road_submission_limits WHERE id IN (SELECT id FROM road_submission_limits WHERE updated_at<? LIMIT 100)').bind(now-86400000).run();
    const limit=await db.prepare('INSERT INTO road_submission_limits(id,updated_at) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at WHERE road_submission_limits.updated_at<=?').bind(id,now,now-30000).run();
    if(!limit.meta.changes)return Response.json({error:'Please wait 30 seconds before submitting again.'},{status:429,headers:{...headers,'Retry-After':'30'}});
    const repo=await verifyRepository(name,(env as unknown as {GITHUB_READ_TOKEN?:string}).GITHUB_READ_TOKEN);
    await saveRegistration(db,repo);
    return Response.json({repository:repo},{headers});
  } catch(error) {
    return reply(error instanceof RegistrationError ? error.message : 'Registration temporarily unavailable. Please try again.',error instanceof RegistrationError ? error.status : 503);
  }
}
