import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { chickenCycle, visibleChickens, crossingDuration, validChickenBatch, CHICKEN_UPSERT, ADVANCE_CROSSING, DRIVE_DISTANCE } from '../lib/chickens.ts';
const epoch = Date.UTC(2026,0,1);
test('five-minute countdown starts on departure, and motion remains continuous', () => {
  const schedule = {round:1, startedAt:epoch, departAt:epoch+crossingDuration(1000)*1000, stopAt:epoch+crossingDuration(1000)*1000+300000, crossingCount:1000, baseDistance:0};
  let previous = -1;
  for(let ms=0; ms<610000; ms+=10) {
    const c=chickenCycle(epoch+ms,schedule); assert.ok(c.distance>=previous); previous=c.distance;
    if(epoch+ms<schedule.departAt) assert.equal(c.distance,0);
  }
  assert.equal(chickenCycle(schedule.departAt,schedule).nextIn,300);
  assert.equal(chickenCycle(schedule.departAt+300000,schedule).distance,DRIVE_DISTANCE);
  assert.equal(chickenCycle(schedule.departAt+300000,schedule).crossing,false);
  assert.equal(chickenCycle(schedule.departAt+600000,schedule).crossing,false);
  assert.equal(chickenCycle(schedule.departAt+600000,schedule).waiting,true);
});
test('batches validate integers, identity, and upper bound', () => {
  const v={id:'12345678-1234-1234-1234-123456789abc',round:1,total:200};
  assert.equal(validChickenBatch(v),true);
  assert.equal(validChickenBatch({...v,total:1000000}),true);
  for(const total of [-1,0,.5,Infinity,'20',Number.MAX_SAFE_INTEGER+1]) assert.equal(validChickenBatch({...v,total}),false);
});
test('atomic cumulative totals deduplicate retries and cap untrusted jumps', () => {
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE chicken_clicks (id TEXT, round INTEGER, total INTEGER, PRIMARY KEY(id,round)); CREATE TABLE chicken_limits (id TEXT PRIMARY KEY, nonce TEXT)');
  db.exec('CREATE TABLE chicken_schedule (id INTEGER PRIMARY KEY, round INTEGER, stop_at INTEGER); INSERT INTO chicken_schedule VALUES(1,1,10000)');
  db.prepare('INSERT INTO chicken_limits VALUES (?,?)').run('ip','nonce');
  const send=(total,nonce='nonce')=>db.prepare(CHICKEN_UPSERT).run('user',1,total,'ip',nonce,1,100,total);
  const count=()=>db.prepare('SELECT total FROM chicken_clicks').get().total;
  send(15); send(15); send(10); assert.equal(count(),15);
  send(30); assert.equal(count(),30);
  send(6000,'wrong'); assert.equal(count(),30);
  send(6000); assert.equal(count(),230);
  db.exec('UPDATE chicken_schedule SET round = 2');
  send(6000); assert.equal(count(),230);
  db.close();
});
test('million-chicken queue renders a moving window, with each chicken exiting once', () => {
  for(const seconds of [0,9.99,10,500,100000,125010]) {
    const window=visibleChickens(1000000,seconds);
    assert.ok(window.end-window.first<=81);
    assert.equal(window.remaining,1000000-window.first);
  }
  assert.deepEqual(visibleChickens(0,0),{first:0,end:0,remaining:0});
  assert.equal(visibleChickens(1000000,crossingDuration(1000000)).remaining,0);
  assert.equal(visibleChickens(1,10).end-visibleChickens(1,10).first,0);
});
test('round transition freezes count atomically and a subsequent empty crossing has none', () => {
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE chicken_clicks (round INTEGER,total INTEGER); CREATE TABLE chicken_schedule (id INTEGER PRIMARY KEY,round INTEGER,started_at INTEGER,depart_at INTEGER,stop_at INTEGER,crossing_count INTEGER,base_distance INTEGER); INSERT INTO chicken_schedule VALUES(1,1,0,0,300000,0,0); INSERT INTO chicken_clicks VALUES(1,1000000)');
  const advance=(round,start)=>db.prepare(ADVANCE_CROSSING).run(round,start,start,start,DRIVE_DISTANCE,round);
  advance(1,300000); advance(1,300000);
  let row=db.prepare('SELECT * FROM chicken_schedule').get();
  assert.equal(row.round,2); assert.equal(row.crossing_count,1000000);
  assert.equal(row.stop_at-row.depart_at,300000);
  assert.equal(row.depart_at,300000+crossingDuration(1000000)*1000);
  advance(2,row.stop_at);
  row=db.prepare('SELECT * FROM chicken_schedule').get();
  assert.equal(row.crossing_count,0); assert.equal(row.depart_at,row.started_at);
  assert.equal(row.base_distance,2*DRIVE_DISTANCE);
  db.close();
});
