import test from 'node:test';
import assert from 'node:assert/strict';
import { recordSceneSubmission } from '../lib/render-probe.ts';

test('scene probe counts submissions and retains the largest observed interval', () => {
  const probe = { submittedFrames: 0, lastSubmittedAt: null, maxGapMs: 0 };
  recordSceneSubmission(probe, 5000);
  assert.deepEqual(probe, { submittedFrames: 1, lastSubmittedAt: 5000, maxGapMs: 0 });
  for (const now of [5016, 5032, 5200, 5216]) recordSceneSubmission(probe, now);
  assert.equal(probe.submittedFrames, 5);
  assert.equal(probe.maxGapMs, 168);
  assert.equal(probe.lastSubmittedAt, 5216);
});
