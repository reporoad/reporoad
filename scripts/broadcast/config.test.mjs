import test from 'node:test';
import assert from 'node:assert/strict';
import { config, ffmpegArgs } from './config.mjs';

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
