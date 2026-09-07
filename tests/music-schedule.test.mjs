import test from 'node:test';
import assert from 'node:assert/strict';
import { createMusicSchedule, shuffledOrder } from '../lib/music-schedule.ts';
test('shuffle contains every track once and changes each cycle',()=>{
  for(let cycle=-2;cycle<5;cycle++){
    const order=shuffledOrder(792,cycle);
    assert.equal(new Set(order).size,792);
    assert.notEqual(order.at(-1),shuffledOrder(792,cycle+1)[0]);
    assert.notDeepEqual(order,shuffledOrder(792,cycle+1));
  }
});
test('new player instances and deployments calculate identical shared positions',()=>{
  const durations=[125,183,240,95,144],a=createMusicSchedule(durations),b=createMusicSchedule(durations);
  for(const t of [-1000,0,1,164,9999,21598311])assert.deepEqual(a(t),b(t));
});
test('crossfade continuity across a shuffled cycle boundary',()=>{
  const d=[125,183,240,95,144],mix=createMusicSchedule(d),total=d.reduce((s,v)=>s+v-5,0);
  const before=mix(total-0.01),after=mix(total+0.01);
  assert.equal(before.index,after.tracks[1].index);
  assert.equal(after.index,before.next);
  assert.ok(Math.abs(after.tracks.reduce((s,t)=>s+t.gain,0)-1)<1e-9);
  assert.ok(Math.abs(after.tracks[1].offset-(d[before.index]-5+0.01))<1e-8);
});
