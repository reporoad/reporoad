import test from 'node:test';
import assert from 'node:assert/strict';
import {musicKey,byteRange,readMusic,uploadMusic} from '../lib/music-storage.ts';
const token='test-only-not-a-secret-'.repeat(3);
const meta={size:10,httpEtag:'"etag"',customMetadata:{sha256:'a'.repeat(64)}};
test('only catalog and safe music paths are accepted',()=>{
  assert.equal(musicKey('catalog.json'),true);assert.equal(musicKey('library/one/Song name.mp3'),true);
  for(const p of ['../secret','library/../secret.mp3','library//x.mp3','library/x\\y.mp3','library/x.html'])assert.equal(musicKey(p),false);
});
test('ranges include open-ended and suffix requests; reject invalid bounds',()=>{
  assert.deepEqual(byteRange('bytes=2-5',10),{offset:2,length:4});
  assert.deepEqual(byteRange('bytes=-3',10),{offset:7,length:3});
  assert.deepEqual(byteRange('bytes=8-',10),{offset:8,length:2});
  for(const h of ['bytes=-0','bytes=10-','bytes=3-2','bytes=0-1,4-5','bytes=-'])assert.equal(byteRange(h,10),null);
});
test('reads stream ranges and HEAD does not fetch object bodies',async()=>{
  let reads=0;const bucket={head:async()=>meta,get:async(_,options)=>{reads++;assert.deepEqual(options.range,{offset:2,length:4});return {body:'2345'}}};
  const r=await readMusic(new Request('https://test/music/library/a.mp3',{headers:{Range:'bytes=2-5'}}),bucket,'library/a.mp3');
  assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),'bytes 2-5/10');assert.equal(await r.text(),'2345');
  const h=await readMusic(new Request('https://test',{method:'HEAD'}),bucket,'library/a.mp3');assert.equal(h.status,200);assert.equal(reads,1);
  const invalid=await readMusic(new Request('https://test',{headers:{Range:'bytes=999-'}}),bucket,'library/a.mp3');assert.equal(invalid.status,416);
});
test('uploads fail closed before accessing storage',async()=>{
  const bucket={head:()=>assert.fail('unauthorized storage access')};
  for(const t of [undefined,token])assert.equal((await uploadMusic(new Request('https://test/api/music-upload',{method:'PUT'}),bucket,t)).status,401);
});
test('upload validates size, preserves existing songs and passes checksum to R2',async()=>{
  const request=(key,extra={})=>new Request(`https://test/api/music-upload?key=${key}`,{method:'PUT',body:'123',headers:{Authorization:`Bearer ${token}`,'Content-Length':'3','X-Content-SHA256':'a'.repeat(64),...extra}});
  const existing={head:async()=>meta,put:()=>assert.fail('existing audio overwritten')};
  assert.equal((await uploadMusic(request('library/a.mp3'),existing,token)).status,200);
  assert.equal((await uploadMusic(request('library/a.mp3',{'X-Content-SHA256':'b'.repeat(64)}),existing,token)).status,409);
  let writes=0;const empty={head:async()=>null,put:async(_,body,options)=>{writes++;assert.equal(options.sha256,'a'.repeat(64));assert.ok(body instanceof ReadableStream)}};
  assert.equal((await uploadMusic(request('library/a.mp3'),empty,token)).status,201);assert.equal(writes,1);
  assert.equal((await uploadMusic(request('library/a.mp3',{'Content-Length':'50000001'}),empty,token)).status,413);
  assert.equal((await uploadMusic(request('catalog.json'),empty,token)).status,400);
});
