import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {CaptureHealth,restartDelay} from './health.mjs';
import {supervise} from './supervisor.mjs';

const sample=(frames,time)=>({frames,audio:[{paused:false,ready:4,time}]});
test('detects stalled encoder, frozen browser and non-advancing audio',()=>{
  const h=new CaptureHealth(0);
  h.progress(100,5000);
  assert.equal(h.check(sample(60,1),sample(0,0),5000),null);
  h.progress(100,24000);
  assert.match(h.check(sample(120,2),sample(60,1),26000),/Encoder/);
  h.progress(200,26000);
  assert.match(h.check(sample(60,1),sample(60,1),26000),/Browser/);
  const a=new CaptureHealth(0,120000);
  assert.equal(a.check(sample(1,1),sample(0,1),0),null);
  assert.match(a.check(sample(2,1),sample(1,1),30000),/Audio/);
  assert.equal(a.check(sample(3,2),sample(2,1),35000),null);
});
test('recovery clears a fault so a restarted page is judged from scratch',()=>{
  const h=new CaptureHealth(0,120000);
  assert.equal(h.check(sample(1,1),sample(0,1),0),null);
  assert.match(h.check(sample(2,1),sample(1,1),30000),/Audio/);
  h.reset(30000);
  assert.equal(h.check(sample(3,1),sample(2,1),40000),null,'kept faulting after recovery');
  assert.equal(h.check(sample(4,1),sample(3,1),61000),null);
  assert.match(h.check(sample(5,1),sample(4,1),75000),/Audio/,'stopped watching after recovery');
});
test('recovery also forgives the encoder gap it spent recovering',()=>{
  const h=new CaptureHealth(0);
  h.progress(100,1000);
  assert.match(h.check(sample(60,1),sample(0,0),40000),/Encoder/);
  h.reset(40000);
  assert.equal(h.check(sample(120,2),sample(60,1),50000),null);
});
test('retry delay is bounded',()=>assert.deepEqual([0,1,2,3,4,999].map(restartDelay),[5,10,20,40,60,60]));
test('supervisor retries failed worker and stops retrying on abort',async()=>{
  const abort=new AbortController();let attempts=0;const delays=[];
  await supervise('unused',[],{
    signal:abort.signal,log:()=>{},
    spawnWorker:()=>{
      attempts++; const child=new EventEmitter();child.exitCode=null;child.signalCode=null;
      queueMicrotask(()=>{child.exitCode=224;child.emit('exit',224,null)});
      return child;
    },
    sleep:async(ms)=>{delays.push(ms);if(attempts===3)abort.abort()},
  });
  assert.equal(attempts,3);assert.deepEqual(delays,[5000,10000,20000]);
});
test('supervisor restarts a worker that never becomes ready',async()=>{
  const abort=new AbortController();let killed=false;
  await supervise('unused',[],{
    startupMs:5,tickMs:5,signal:abort.signal,log:()=>{},
    spawnWorker:()=>{
      const child=new EventEmitter();child.exitCode=null;child.signalCode=null;
      child.kill=()=>{killed=true;queueMicrotask(()=>{child.signalCode='SIGTERM';child.emit('exit',null,'SIGTERM')})};return child;
    },
    sleep:async()=>abort.abort(),
  });
  assert.equal(killed,true);
});
