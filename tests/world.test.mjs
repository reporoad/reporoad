import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPlots,
  restorePlots,
  safeShopUrl,
  claimPlot,
  publishPlot,
  chooseTrack,
} from '../lib/world.ts';

test('a demo claim survives storage and cannot take an example shop', () => {
  const initial = createPlots();
  assert.equal(initial.length, 24);
  assert.deepEqual(claimPlot(initial, 1), initial);
  const claimed = claimPlot(initial, 2);
  assert.equal(claimed[1].status, 'yours');
  assert.equal(initial[1].status, 'available');
  assert.deepEqual(restorePlots(JSON.stringify(claimed)), claimed);
});
test('invalid saved data safely falls back instead of crashing the scene', () => {
  for (const input of [
    '{broken',
    'null',
    '[]',
    JSON.stringify(Array(24).fill(createPlots()[0])),
  ])
    assert.deepEqual(restorePlots(input), createPlots());
  const bad = createPlots();
  bad[1].logo = 'https://untrusted.test/tracker.png';
  assert.deepEqual(restorePlots(JSON.stringify(bad)), createPlots());
});
test('publishing only updates a claimed plot and rejects unsafe links', () => {
  const initial = createPlots();
  assert.throws(() =>
    publishPlot(initial, { ...initial[1], status: 'yours', name: 'My café' }),
  );
  const claimed = claimPlot(initial, 2);
  const next = publishPlot(claimed, {
    ...claimed[1],
    name: '  My café  ',
    template: 'cabin',
    url: 'https://example.com/shop',
  });
  assert.equal(next[1].name, 'My café');
  assert.equal(next[1].template, 'cabin');
  assert.deepEqual(next[0], initial[0]);
  assert.throws(() =>
    publishPlot(claimed, { ...claimed[1], url: 'javascript:alert(1)' }),
  );
  assert.throws(() => publishPlot(claimed, { ...claimed[1], name: '   ' }));
});
test('shop links accept only web destinations', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,test',
    'file:///etc/passwd',
    '//example.com',
    'not a url',
  ])
    assert.equal(safeShopUrl(url), null);
  assert.equal(safeShopUrl(''), '');
  assert.equal(
    safeShopUrl('https://example.com/shop'),
    'https://example.com/shop',
  );
});
test('a vote chooses the next track and empty rounds rotate', () => {
  assert.equal(chooseTrack(2, 0), 2);
  assert.equal(chooseTrack(0, 2), 0);
  assert.equal(chooseTrack(null, 2), 0);
  assert.equal(chooseTrack(99, 0), 1);
});
