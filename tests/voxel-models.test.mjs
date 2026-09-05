import test from 'node:test';
import assert from 'node:assert/strict';
import { treeModel, steeringWheelModel, cloudModel, vergeModel } from '../lib/voxel-models.ts';

test('voxel models are deterministic, finite and have positive dimensions', () => {
  for (const model of [() => treeModel(false, 'Summer'), () => treeModel(true, 'Winter'), steeringWheelModel, cloudModel, () => vergeModel('Spring', 4)]) {
    const parts = model();
    assert.deepEqual(parts, model());
    assert.ok(parts.length > 0 && parts.length < 2000);
    for (const p of parts) {
      assert.ok(p.position.every(Number.isFinite));
      assert.ok(p.size.every(n => Number.isFinite(n) && n > 0));
      assert.match(p.color, /^#[0-9a-f]{6}$/i);
    }
  }
});

test('roadside flowers remain outside the road and inside the recycling section', () => {
  for (let seed = 0; seed < 12; seed++) {
    const parts = vergeModel('Summer', seed);
    for (const p of parts) {
      assert.ok(Math.abs(p.position[0]) - p.size[0] / 2 > 3.7);
      assert.ok(p.position[2] > -33 && p.position[2] < 1);
    }
    assert.ok(new Set(parts.map(p => p.color)).size > 5);
  }
});

test('wheel has an open upper centre so the instruments can remain visible', () => {
  for (const p of steeringWheelModel()) {
    if (p.position[1] > 0.12 && p.position[1] < 0.25)
      assert.ok(Math.abs(p.position[0]) > 0.15);
  }
});
