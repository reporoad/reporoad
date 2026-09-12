import { APP_URL, noStore, sameOrigin, session, setCookie } from '@/lib/github-auth';
import { database } from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  try {const user=await session(request);return Response.json({login:user?.login || null,installUrl:APP_URL},{headers:noStore});}
  catch {return Response.json({error:'GitHub connection unavailable.'},{status:503,headers:noStore});}
}
export async function DELETE(request:Request) {
  if(!sameOrigin(request))return new Response(null,{status:403,headers:noStore});
  try {const user=await session(request);if(user)await database().prepare('DELETE FROM github_sessions WHERE id=?').bind(user.id).run();}
  catch {return new Response(null,{status:503,headers:noStore});}
  return Response.json({ok:true},{headers:{...noStore,'Set-Cookie':setCookie('__Host-reporoad-github','',0)}});
}
