import test from 'node:test';
import assert from 'node:assert/strict';
import {
  roadSectionZ,
  roadMarkerZ,
  ROAD_LENGTH,
  CAMERA_Z,
  RECYCLE_BEHIND_Z,
} from '../lib/road.ts';

test('plots travel past the camera instead of disappearing on approach', () => {
  // Previous implementation jumped from section z=20 to z=-364 at distance=0,
  // while the plot centre was still z=-10, ahead of the camera at z=7.
  for (let i = 0; i < 12; i++) {
    const approach = i * 32;
    assert.ok(
      Math.abs(roadSectionZ(i, approach + 0.1) - roadSectionZ(i, approach)) <
        0.11,
    );
    const passed = roadSectionZ(i, approach + 55) - 30 - 7;
    assert.ok(
      passed > CAMERA_Z,
      'whole plot footprint should pass behind the car',
    );
  }
});
test('every section reset over two laps happens fully behind the camera', () => {
  let resets = 0;
  for (let i = 0; i < 12; i++) {
    let previous = roadSectionZ(i, 0);
    for (let d = 0.25; d <= ROAD_LENGTH * 2; d += 0.25) {
      const current = roadSectionZ(i, d);
      if (current < previous - 100) {
        resets++;
        assert.ok(previous - 30 - 7 > CAMERA_Z);
        assert.ok(current < -265, 'reset must be beyond the fog');
      } else assert.ok(Math.abs(current - previous - 0.25) < 1e-9);
      previous = current;
    }
  }
  assert.equal(resets, 24);
});
test('section and lane marker positions are continuous across the distance loop', () => {
  for (let i = 0; i < 12; i++)
    assert.ok(
      Math.abs(roadSectionZ(i, ROAD_LENGTH - 0.01) - roadSectionZ(i, 0)) < 0.02,
    );
  for (let i = 0; i < 48; i++)
    assert.ok(
      Math.abs(roadMarkerZ(i, ROAD_LENGTH - 0.01) - roadMarkerZ(i, 0)) < 0.02,
    );
  assert.ok(RECYCLE_BEHIND_Z - 37 > CAMERA_Z);
});
