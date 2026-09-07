import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { musicMiddleware } from './server.mjs';
test('music server supports seeking, rejects traversal and does not expose other files',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'reporoad-music-test-'));
  await mkdir(join(dir,'library'));
  await writeFile(join(dir,'library','song.mp3'),'0123456789');
  await writeFile(join(dir,'catalog.json'),'{}');
  await writeFile(join(dir,'secret.txt'),'not music');
  const server=createServer(musicMiddleware(dir));
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin=`http://127.0.0.1:${server.address().port}`;
  try {
    const part=await fetch(origin+'/music/library/song.mp3',{headers:{range:'bytes=3-5'}});
    assert.equal(part.status,206);assert.equal(part.headers.get('content-range'),'bytes 3-5/10');assert.equal(await part.text(),'345');
    const tail=await fetch(origin+'/music/library/song.mp3',{headers:{range:'bytes=-2'}});assert.equal(await tail.text(),'89');
    assert.equal((await fetch(origin+'/music/library/song.mp3',{headers:{range:'bytes=99-'}})).status,416);
    assert.equal((await fetch(origin+'/music/library/%2e%2e%2fsecret.txt')).status,403);
    const head=await fetch(origin+'/music/library/song.mp3',{method:'HEAD'});assert.equal(head.headers.get('content-length'),'10');assert.equal(await head.text(),'');
    assert.equal((await fetch(origin+'/music/catalog.json')).status,200);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
