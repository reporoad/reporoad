import { env } from 'cloudflare:workers';
import { database } from './db';
import { digest, unseal } from './github-crypto';
export const CALLBACK = 'https://reporoad.org/api/github/callback';
export const CLIENT_ID = 'Iv23liMKmcAO8XlNGBu1';
export const APP_URL = 'https://github.com/apps/reporoad/installations/new';
export const noStore = {'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer'};
export function secrets() {
  const e = env as unknown as {GITHUB_CLIENT_SECRET?:string; GITHUB_SESSION_SECRET?:string};
  if (!e.GITHUB_CLIENT_SECRET || !e.GITHUB_SESSION_SECRET) throw Error('GitHub sign-in is not configured yet.');
  return {client:e.GITHUB_CLIENT_SECRET, session:e.GITHUB_SESSION_SECRET};
}
export function cookie(request:Request, name:string) {
  return request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${name}=`))?.slice(name.length+1) || '';
}
export function setCookie(name:string,value:string,age:number) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
}
export function sameOrigin(request:Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
export async function github(path:string, token:string) {
  const response=await fetch(`https://api.github.com${path}`,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','User-Agent':'RepoRoad'}});
  if(!response.ok) throw Error(response.status===401 ? 'GitHub session expired. Connect again.' : 'GitHub could not verify access. Check the app installation and try again.');
  return response.json();
}
export async function session(request:Request) {
  const raw=cookie(request,'__Host-reporoad-github');
  if(!/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
  const row=await database().prepare('SELECT id,token,user_id,login,expires_at FROM github_sessions WHERE id=? AND expires_at>?').bind(await digest(raw),Date.now()).first<{id:string;token:string;user_id:number;login:string;expires_at:number}>();
  if(!row) return null;
  const token=await unseal(row.token,secrets().session,'github-token');
  if(typeof token!=='string') return null;
  return {...row, token};
}
