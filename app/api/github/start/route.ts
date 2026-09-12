import { CALLBACK, CLIENT_ID, noStore, secrets, setCookie } from '@/lib/github-auth';
import { digest, randomToken, seal } from '@/lib/github-crypto';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  if(new URL(request.url).origin!==new URL(CALLBACK).origin)
    return new Response(null,{status:302,headers:{...noStore,Location:'https://reporoad.org/api/github/start'}});
  try {
    const state=randomToken(), verifier=randomToken();
    const value=await seal({state,verifier,expires:Date.now()+600000},secrets().session,'github-oauth');
    const url=new URL('https://github.com/login/oauth/authorize');
    url.search=new URLSearchParams({client_id:CLIENT_ID,redirect_uri:CALLBACK,state,code_challenge:await digest(verifier),code_challenge_method:'S256'}).toString();
    return new Response(null,{status:302,headers:{...noStore,Location:url.href,'Set-Cookie':setCookie('__Host-reporoad-oauth',value,600)}});
  } catch {return new Response('GitHub connection is not configured yet.',{status:503,headers:noStore});}
}
