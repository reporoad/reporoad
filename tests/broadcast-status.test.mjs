import { test } from 'node:test';
import assert from 'node:assert/strict';
import { broadcastStatus } from '../lib/broadcast-status.ts';
const driving = {queued:128, crossing:false, remaining:0, waiting:false, nextIn:222, error:''};
test('broadcast displays the shared queue and countdown, including zero and large queues', () => {
  assert.deepEqual(broadcastStatus(driving), {headline:'128 chickens queued', detail:'Next crossing in 3:42'});
  assert.equal(broadcastStatus({...driving,queued:0}).headline,'0 chickens queued');
  assert.equal(broadcastStatus({...driving,queued:1000000}).headline,'1,000,000 chickens queued');
  assert.equal(broadcastStatus({...driving,nextIn:300}).detail,'Next crossing in 5:00');
});
test('crossing remaining and next-round queue are distinct', () => {
  assert.deepEqual(broadcastStatus({...driving,crossing:true,remaining:1}), {headline:'1 chicken left to cross',detail:'128 queued for the next crossing'});
  assert.match(broadcastStatus({...driving,waiting:true}).detail,/checking the queue/);
});
test('missing or failed connection does not pretend the queue is empty', () => {
  assert.match(broadcastStatus({...driving,queued:null}).headline,/Connecting/);
  assert.match(broadcastStatus({...driving,error:'Disconnected'}).headline,/Connecting/);
});
