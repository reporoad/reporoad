// Pure handlers accept a bucket so authorization/ranges can be tested without production.
export function musicKey(key: string) {
  return key === 'catalog.json' || (key.startsWith('library/') && /\.mp3$/i.test(key) &&
    key.length < 900 && !key.split('/').some(p => !p || p === '.' || p === '..') && !/[\\\x00-\x1f\x7f]/.test(key));
}
export function byteRange(header: string, size: number) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!m || (!m[1] && !m[2])) return null;
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start <= end && start < size
    ? {offset:start,length:end-start+1} : null;
}
export async function readMusic(request: Request, bucket: R2Bucket | undefined, key: string) {
  if (!musicKey(key)) return new Response('Not found', {status:404});
  if (!bucket) return new Response('Music storage unavailable', {status:503});
  const object = await bucket.head(key);
  if (!object) return new Response('Music not uploaded yet', {status:404});
  const headers = new Headers({'Content-Type':key === 'catalog.json' ? 'application/json' : 'audio/mpeg',
    'Accept-Ranges':'bytes','Cache-Control':key === 'catalog.json' ? 'no-cache' : 'public, max-age=86400',
    'ETag':object.httpEtag,'X-Content-Type-Options':'nosniff'});
  if (request.headers.get('if-none-match') === object.httpEtag) return new Response(null,{status:304,headers});
  const raw = request.headers.get('range');
  const range = raw ? byteRange(raw,object.size) : undefined;
  if (raw && !range) {headers.set('Content-Range',`bytes */${object.size}`);return new Response(null,{status:416,headers});}
  const partial = range && (!request.headers.has('if-range') || request.headers.get('if-range') === object.httpEtag) ? range : undefined;
  headers.set('Content-Length',String(partial?.length ?? object.size));
  if(partial)headers.set('Content-Range',`bytes ${partial.offset}-${partial.offset+partial.length-1}/${object.size}`);
  if(request.method === 'HEAD')return new Response(null,{status:partial?206:200,headers});
  const result = await bucket.get(key,partial ? {range:partial} : {});
  if(!result)return new Response('Not found',{status:404});
  return new Response(result.body,{status:partial?206:200,headers});
}
async function authorized(request: Request, token?: string) {
  if(!token || token.length < 32)return false;
  const supplied=request.headers.get('authorization');
  if(!supplied?.startsWith('Bearer ') || supplied.length > 256)return false;
  const hash=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  const [a,b]=await Promise.all([hash(supplied.slice(7)),hash(token)]);
  let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];return mismatch===0;
}
export async function uploadMusic(request: Request, bucket: R2Bucket | undefined, token?: string) {
  const response=(text:string,status:number)=>new Response(text,{status,headers:{'Cache-Control':'no-store'}});
  if(!await authorized(request,token))return response('Unauthorized',401);
  if(!bucket)return response('Music storage unavailable',503);
  const key=new URL(request.url).searchParams.get('key') || '';
  if(!musicKey(key))return response('Invalid music key',400);
  const old=await bucket.head(key);
  if(request.method==='HEAD')return new Response(null,{status:old?200:404,headers:{'Cache-Control':'no-store',
    ...(old?{'X-Content-SHA256':old.customMetadata?.sha256 || '', 'Content-Length':String(old.size)}:{})}});
  if(request.method!=='PUT')return response('Method not allowed',405);
  const bytes=Number(request.headers.get('content-length'));
  const checksum=request.headers.get('x-content-sha256') || '';
  if(!Number.isSafeInteger(bytes)||bytes<=0||bytes>(key==='catalog.json'?2_000_000:50_000_000))return response('Invalid upload size',413);
  if(!/^[a-f0-9]{64}$/.test(checksum)||!request.body)return response('Checksum and body required',400);
  if(old && key!=='catalog.json')return response(old.customMetadata?.sha256===checksum?'Already uploaded':'Existing object differs',old.customMetadata?.sha256===checksum?200:409);
  let body: ReadableStream | string = request.body;
  if(key==='catalog.json'){
    if(bytes>2_000_000)return response('Catalog too large',413);
    const text=await request.text();
    try{
      const catalog=JSON.parse(text);
      if(!Array.isArray(catalog.tracks)||!catalog.tracks.length||catalog.tracks.length>10000)throw Error();
      for(const t of catalog.tracks){
        if(typeof t.name!=='string'||typeof t.collection!=='string'||typeof t.src!=='string'||!t.src.startsWith('/music/library/')||!musicKey(decodeURIComponent(t.src.slice(7)))||!Number.isFinite(t.duration)||t.duration<=10)throw Error();
      }
    }catch{return response('Invalid catalog',400)}
    body=text;
  }
  // R2 validates SHA-256 while streaming, avoiding full MP3 allocations in the Worker.
  try {
    await bucket.put(key,body,{sha256:checksum,customMetadata:{sha256:checksum},
      httpMetadata:{contentType:key==='catalog.json'?'application/json':'audio/mpeg'}});
  } catch { return response('Upload failed validation or storage is unavailable',502); }
  return response('Uploaded',201);
}
