import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { createReadStream, statSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export function musicMiddleware(root = resolve('media/music')) {
  return (req,res,next=()=>{res.writeHead(404);res.end();})=>{
    let path;
    try {path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
    if(path!=='/music/catalog.json'&&!path.startsWith('/music/library/'))return next();
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    try {
      const base=realpathSync(root),file=realpathSync(resolve(root,path.slice('/music/'.length)));
      if(!file.startsWith(base+sep) || !(file.endsWith('.json')||/\.mp3$/i.test(file))) {res.writeHead(403);res.end();return;}
      const s=statSync(file);if(!s.isFile())throw Error();
      let start=0,end=s.size-1,partial=false;
      if(req.headers.range){
        const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if(!m || (!m[1]&&!m[2])){res.writeHead(416,{'Content-Range':`bytes */${s.size}`});res.end();return;}
        start=m[1]?Number(m[1]):Math.max(0,s.size-Number(m[2]));
        end=m[1]&&m[2]?Math.min(Number(m[2]),s.size-1):s.size-1;
        if(start>end||start>=s.size){res.writeHead(416,{'Content-Range':`bytes */${s.size}`});res.end();return;}partial=true;
      }
      res.writeHead(partial?206:200,{'Content-Type':file.endsWith('.json')?'application/json':'audio/mpeg',
        'Accept-Ranges':'bytes','Content-Length':end-start+1,'Cache-Control':file.endsWith('.json')?'no-cache':'public, max-age=3600',
        ...(partial?{'Content-Range':`bytes ${start}-${end}/${s.size}`}:{})});
      if(req.method==='HEAD'){res.end();return;}
      const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
    }catch{res.writeHead(404);res.end();}
  };
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const upstream=new URL(process.env.REPOROAD_UPSTREAM || 'http://localhost:3000');
  if(!['http:','https:'].includes(upstream.protocol))throw Error('Invalid upstream');
  const music=musicMiddleware(process.env.REPOROAD_MUSIC_ROOT || resolve('media/music'));
  createServer((req,res)=>music(req,res,()=>{
    const request=upstream.protocol==='https:'?httpsRequest:httpRequest;
    const incoming=new URL(req.url,'http://localhost');
    const target=new URL(upstream);target.pathname=incoming.pathname;target.search=incoming.search;
    const proxied=request(target,{method:req.method,headers:{...req.headers,host:upstream.host}},response=>{
      res.writeHead(response.statusCode,response.headers);response.pipe(res);
    });proxied.on('error',()=>{res.writeHead(502);res.end('Upstream unavailable');});req.pipe(proxied);
  })).listen(Number(process.env.REPOROAD_MUSIC_PORT || 3100),'127.0.0.1',()=>console.log('Local music + site proxy ready'));
}
