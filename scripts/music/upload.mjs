import {readFileSync,realpathSync,statSync,createReadStream} from 'node:fs';
import {resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';

const origin=new URL(process.env.REPOROAD_UPLOAD_URL || 'https://reporoad.suppers.chatgpt.site');
if(origin.protocol!=='https:' && !['localhost','127.0.0.1'].includes(origin.hostname))throw Error('HTTPS required');
if(!process.env.MUSIC_UPLOAD_TOKEN_FILE)throw Error('Set MUSIC_UPLOAD_TOKEN_FILE to your private token file');
const token=readFileSync(process.env.MUSIC_UPLOAD_TOKEN_FILE,'utf8').trim();
const root=realpathSync(process.env.REPOROAD_MUSIC_ROOT || 'media/music');
const catalog=JSON.parse(readFileSync(resolve(root,'catalog.json'),'utf8'));
const concurrency=Number(process.env.MUSIC_UPLOAD_CONCURRENCY || 2);
if(!Number.isInteger(concurrency)||concurrency<1||concurrency>8)throw Error('MUSIC_UPLOAD_CONCURRENCY must be 1–8');
const keys=[...new Set(catalog.tracks.map(t=>decodeURIComponent(t.src.slice('/music/'.length))))];
async function send(key){
  const file=realpathSync(resolve(root,key));
  if(!file.startsWith(root+sep))throw Error('Music file outside library');
  const size=statSync(file).size;
  if(size>50_000_000)throw Error('Music file exceeds upload limit');
  const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);
  const checksum=hash.digest('hex');
  const url=new URL('/api/music-upload',origin);url.searchParams.set('key',key);
  const headers={Authorization:`Bearer ${token}`};
  const old=await fetch(url,{method:'HEAD',headers,redirect:'error',signal:AbortSignal.timeout(30000)});
  if(old.status===200 && old.headers.get('x-content-sha256')===checksum && Number(old.headers.get('content-length'))===size)return 'skipped';
  if(![200,404].includes(old.status))throw Error(`Upload check HTTP ${old.status}`);
  if(old.status===200 && key!=='catalog.json')throw Error(`Existing music differs: ${key}`);
  const result=await fetch(url,{method:'PUT',headers:{...headers,'Content-Length':String(size),'X-Content-SHA256':checksum},
    body:createReadStream(file),duplex:'half',redirect:'error',signal:AbortSignal.timeout(180000)});
  if(!result.ok)throw Error(`Upload HTTP ${result.status}: ${key}`);
  await result.body?.cancel();return 'uploaded';
}
let completed=0;
async function upload(key){
  for(let attempt=0;attempt<4;attempt++){
    try{const status=await send(key);console.log(`${++completed}/${keys.length+1} ${status}: ${key}`);return}
    catch(e){if(attempt===3)throw e;await delay(2000*2**attempt)}
  }
}
// Bounded streamed uploads; publish the catalog only after every song succeeds.
let cursor=0;
await Promise.all(Array.from({length:concurrency},async()=>{while(cursor<keys.length)await upload(keys[cursor++])}));
await upload('catalog.json');
console.log('Music library uploaded and catalog published.');
