import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera } from 'three';
import { cabinMirror, mirrorRefreshAt } from '../lib/cabin-mirror.ts';

test('mirror camera projects equal world lengths equally on the physical glass', () => {
  const camera = new PerspectiveCamera(cabinMirror.verticalFov, cabinMirror.aspect);
  const projection = camera.projectionMatrix.elements;
  const horizontal = projection[0] * cabinMirror.width;
  const vertical = projection[5] * cabinMirror.height;
  assert.ok(Math.abs(horizontal - vertical) < 1e-9);
  assert.ok(Math.abs(cabinMirror.targetWidth / cabinMirror.targetHeight - cabinMirror.aspect) < 0.02);
  assert.ok(cabinMirror.targetWidth * cabinMirror.targetHeight <= 384 * 144);
});

test('mirror refresh retains its cadence at common renderer frame rates', () => {
  for (const fps of [24, 30, 60, 120]) {
    let previous = 0, renders = 0;
    for (let frame = 1; frame <= fps * 10; frame++) {
      const next = mirrorRefreshAt(previous, frame * 1000 / fps);
      if (next !== null) { previous = next; renders++; }
    }
    assert.equal(renders, 200, `${fps} FPS gives twenty mirror refreshes per second`);
  }
});

test('a delayed frame does not create catch-up rendering or discard the remainder', () => {
  assert.equal(mirrorRefreshAt(0, 49), null);
  assert.equal(mirrorRefreshAt(0, 50), 50);
  assert.equal(mirrorRefreshAt(50, 1234), 1200);
  assert.equal(mirrorRefreshAt(1200, 1234), null);
  assert.equal(mirrorRefreshAt(1200, 1250), 1250);
});
