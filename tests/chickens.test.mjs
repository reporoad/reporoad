import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { chickenCycle, validChickenBatch, CHICKEN_UPSERT } from '../lib/chickens.ts';
const epoch = Date.UTC(2026,0,1);
test('five-minute crossing stops for 20 seconds with continuous forward travel', () => {
  let previous = -1;
  for(let ms=0; ms<610000; ms+=10) {
    const c=chickenCycle(epoch+ms); assert.ok(c.distance>=previous); previous=c.distance;
    if(c.phase<20) assert.equal(c.distance,c.round*1794);
  }
  assert.ok(chickenCycle(epoch+300000).distance-chickenCycle(epoch+299999).distance<.001);
  assert.equal(chickenCycle(epoch+300000).crossing,true);
  assert.equal(chickenCycle(epoch+320000).crossing,false);
});
test('batches validate integers, identity, and upper bound', () => {
  const v={id:'12345678-1234-1234-1234-123456789abc',round:1,total:200};
  assert.equal(validChickenBatch(v),true);
  for(const total of [-1,0,.5,6001,Infinity,'20']) assert.equal(validChickenBatch({...v,total}),false);
});
test('atomic cumulative totals deduplicate retries and cap untrusted jumps', () => {
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE chicken_clicks (id TEXT, round INTEGER, total INTEGER, PRIMARY KEY(id,round)); CREATE TABLE chicken_limits (id TEXT PRIMARY KEY, nonce TEXT)');
  db.prepare('INSERT INTO chicken_limits VALUES (?,?)').run('ip','nonce');
  const send=(total,nonce='nonce')=>db.prepare(CHICKEN_UPSERT).run('user',1,total,'ip',nonce,total);
  const count=()=>db.prepare('SELECT total FROM chicken_clicks').get().total;
  send(15); send(15); send(10); assert.equal(count(),15);
  send(30); assert.equal(count(),30);
  send(6000,'wrong'); assert.equal(count(),30);
  send(6000); assert.equal(count(),230);
  db.close();
});
