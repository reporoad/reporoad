import { CALLBACK, CLIENT_ID, cookie, github, noStore, secrets, setCookie } from '@/lib/github-auth';
import { digest, randomToken, seal, unseal } from '@/lib/github-crypto';
import { database } from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const headers=new Headers(noStore);
  headers.append('Set-Cookie',setCookie('__Host-reporoad-oauth','',0));
  try {
    const url=new URL(request.url), config=secrets();
    if(url.origin!==new URL(CALLBACK).origin)throw Error();
    const data=await unseal(cookie(request,'__Host-reporoad-oauth'),config.session,'github-oauth') as {state:string;verifier:string;expires:number};
    const code=url.searchParams.get('code');
    if(!data || !Number.isFinite(data.expires) || data.expires<Date.now() || data.state!==url.searchParams.get('state') || typeof data.verifier!=='string' || !code || code.length>512)throw Error();
    const response=await fetch('https://github.com/login/oauth/access_token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:CLIENT_ID,client_secret:config.client,redirect_uri:CALLBACK,code,code_verifier:data.verifier})});
    const token=await response.json() as {access_token?:string;expires_in?:number};
    if(!response.ok || typeof token.access_token!=='string' || !token.access_token.startsWith('ghu_'))throw Error();
    const user=await github('/user',token.access_token) as {id:number;login:string};
    if(!Number.isSafeInteger(user.id) || typeof user.login!=='string')throw Error();
    const id=randomToken(), now=Date.now(), age=Math.min(3600,Number(token.expires_in)||3600);
    if(age<=0)throw Error();
    const db=database();
    await db.prepare('DELETE FROM github_sessions WHERE id IN (SELECT id FROM github_sessions WHERE expires_at<? LIMIT 500)').bind(now).run();
    // Bound storage and discard older sessions for this same GitHub identity.
    await db.prepare('DELETE FROM github_sessions WHERE user_id=?').bind(user.id).run();
    const inserted=await db.prepare('INSERT INTO github_sessions(id,token,user_id,login,expires_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM github_sessions)<20000').bind(await digest(id),await seal(token.access_token,config.session,'github-token'),user.id,user.login,now+age*1000).run();
    if(!inserted.meta.changes)throw Error();
    headers.append('Set-Cookie',setCookie('__Host-reporoad-github',id,age));
    headers.set('Location','https://reporoad.org/?tab=add&github=connected');
  } catch {
    headers.set('Location','https://reporoad.org/?tab=add&github=error');
  }
  return new Response(null,{status:302,headers});
}
