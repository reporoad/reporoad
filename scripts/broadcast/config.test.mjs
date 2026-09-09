import test from 'node:test';
import assert from 'node:assert/strict';
import { config, ffmpegArgs, reclaimDisplay } from './config.mjs';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('a display is reclaimed from a dead X server but never from a live one',()=>{
  const dir=mkdtempSync(join(tmpdir(),'reclaim-'));
  const paths=n=>({lock:join(dir,`.X${n}-lock`),socket:join(dir,`X${n}`)});
  const free=paths(1);
  assert.equal(reclaimDisplay(1,{...free,kill:()=>{}}),true,'refused an untouched display');

  const live=paths(2);
  writeFileSync(live.lock,'      4242\n');writeFileSync(live.socket,'');
  assert.equal(reclaimDisplay(2,{...live,kill:()=>{}}),false,'stole a display from a running X server');
  assert.ok(existsSync(live.lock),'deleted a live lock file');

  const owned=paths(3);
  writeFileSync(owned.lock,'      4243\n');writeFileSync(owned.socket,'');
  assert.equal(reclaimDisplay(3,{...owned,kill:()=>{const e=Error('denied');e.code='EPERM';throw e;}}),false,"took another user's display");
  assert.ok(existsSync(owned.lock));

  const stale=paths(4);
  writeFileSync(stale.lock,'      4244\n');writeFileSync(stale.socket,'');
  assert.equal(reclaimDisplay(4,{...stale,kill:()=>{const e=Error('gone');e.code='ESRCH';throw e;}}),true,'left a stale lock in place');
  assert.equal(existsSync(stale.lock),false);
  assert.equal(existsSync(stale.socket),false);

  const orphan=paths(5);
  writeFileSync(orphan.socket,'');
  assert.equal(reclaimDisplay(5,{...orphan,kill:()=>{}}),true,'kept a socket with no lock behind it');
  assert.equal(existsSync(orphan.socket),false);
});

test('local recording is default; old experiments are stripped from the URL',()=>{
  const c=config([],{REPOROAD_URL:'http://localhost:3000/?quality=minimal&mirror=0&v=6'});
  assert.equal(c.mode,'record');assert.equal(c.destination,undefined);
  assert.equal(c.url,'http://localhost:3000/?broadcast=1');
  assert.equal(c.encoder,'h264_nvenc');
});
test('configuration rejects invalid dimensions, encoder and implicit streaming',()=>{
  assert.throws(()=>config(['stream'],{}),/STREAM_URL_FILE/);
  assert.throws(()=>config([],{BROADCAST_WIDTH:'721'}),/even/);
  assert.throws(()=>config([],{BROADCAST_FPS:'0'}),/FPS/);
  assert.throws(()=>config([],{BROADCAST_ENCODER:'something'}),/Encoder/);
});
test('capture uses only the private display and private audio monitor',()=>{
  const c=config([],{BROADCAST_SECONDS:'15'}),args=ffmpegArgs(c,':97','unix:/private/audio');
  assert.ok(args.includes(':97.0+0,0'));assert.ok(args.includes('reporoad.monitor'));
  assert.ok(args.includes('unix:/private/audio'));assert.ok(args.includes('-n'));
  assert.equal(args.at(-1),c.output);assert.equal(args[args.indexOf('-t')+1],'15');
  assert.ok(!args.includes('default'));
});
