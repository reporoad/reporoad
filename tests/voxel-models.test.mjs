import test from 'node:test';
import assert from 'node:assert/strict';
import {
  treeModel,
  steeringWheelModel,
  cloudModel,
  vergeModel,
  shopDetailModel,
} from '../lib/voxel-models.ts';

test('voxel models are deterministic, finite and have positive dimensions', () => {
  for (const model of [
    () => treeModel(false, 'Summer'),
    () => treeModel(true, 'Winter'),
    steeringWheelModel,
    cloudModel,
    () => vergeModel('Spring', 4),
    () => shopDetailModel(1, 'Summer'),
  ]) {
    const parts = model();
    assert.deepEqual(parts, model());
    assert.ok(parts.length > 0 && parts.length < 2000);
    for (const p of parts) {
      assert.ok(p.position.every(Number.isFinite));
      assert.ok(p.size.every((n) => Number.isFinite(n) && n > 0));
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
    assert.ok(new Set(parts.map((p) => p.color)).size > 5);
  }
});

test('tree silhouettes vary by seed but retain a bounded foliage budget', () => {
  for (const pine of [false, true]) for (const season of ['Summer', 'Winter', 'Autumn', 'Spring']) {
    for (let seed = 0; seed < 12; seed++) {
      const tree = treeModel(pine, season, seed);
      assert.ok(tree.length < 1800);
      assert.deepEqual(tree, treeModel(pine, season, seed));
      assert.notDeepEqual(tree, treeModel(pine, season, seed + 1));
      for (const part of tree) {
        assert.ok(Math.abs(part.position[0]) < 2);
        assert.ok(Math.abs(part.position[2]) < 2);
      }
    }
  }
});

test('wheel has an open upper centre so the instruments can remain visible', () => {
  for (const p of steeringWheelModel()) {
    if (p.position[1] > 0.12 && p.position[1] < 0.25)
      assert.ok(Math.abs(p.position[0]) > 0.15);
  }
});

test('joined wheel grips preserve the stepped cells in the shallow lower bowl', () => {
  const rim = steeringWheelModel().filter(
    (p) => p.position[2] === 0 && p.size[2] === 0.085,
  );
  assert.ok(
    rim.length < 32,
    'straight grips are joined instead of individual cubes',
  );
  for (let x = -9; x <= 9; x++)
    for (let y = -9; y <= 9; y++) {
      const cornerLimit = y < 0 ? 11 : 13;
      const outer =
        Math.max(Math.abs(x), Math.abs(y)) <= 8 &&
        Math.abs(x) + Math.abs(y) <= cornerLimit;
      const inner =
        Math.max(Math.abs(x), Math.abs(y)) <= 7 &&
        Math.abs(x) + Math.abs(y) <= cornerLimit - 1;
      const covered = rim.some(
        (p) =>
          Math.abs(x * 0.045 - p.position[0]) < p.size[0] / 2 &&
          Math.abs((y * 0.045 < -0.07 ? -0.07 + (y * 0.045 + 0.07) * 0.88 : y * 0.045) - p.position[1]) < p.size[1] / 2,
      );
      assert.equal(covered, outer && !inner, `rim cell ${x},${y}`);
    }
});

test('wheel lower arc has bounded depth without moving its upper grip', () => {
  const rim = steeringWheelModel().filter(p => p.position[2] === 0 && p.size[2] === 0.085);
  const bottom = Math.min(...rim.map(p => p.position[1] - p.size[1] / 2));
  const top = Math.max(...rim.map(p => p.position[1] + p.size[1] / 2));
  assert.ok(bottom > -0.346 && bottom < -0.345);
  assert.ok(Math.abs(top - 0.383) < 0.00001);
});

test('steering column cover stays below and behind the horn pad', () => {
  const parts = steeringWheelModel();
  const column = parts.find((p) => p.color === '#454334');
  const pad = parts.find((p) => p.color === '#71604f' && p.size[0] > 0.2);
  assert.ok(column && pad);
  assert.ok(column.size[0] >= 0.14, 'cover is wider than the exposed lower spoke');
  assert.ok(column.position[1] + column.size[1] / 2 < pad.position[1]);
  assert.ok(
    column.position[2] + column.size[2] / 2 < pad.position[2] - pad.size[2] / 2,
    'cover cannot hide the horn face',
  );
  assert.ok(column.position[1] - column.size[1] / 2 > -0.36, 'cover stays within the wheel silhouette');
});

test('horn emblem has clipped corners and an inset dark centre', () => {
  const parts = steeringWheelModel();
  const badge = parts.filter(p => p.color === '#99866c');
  assert.equal(badge.length, 3);
  const middle = badge.find(p => Math.abs(p.position[1] + 0.055) < 1e-8);
  assert.ok(middle);
  const caps = badge.filter(p => p !== middle);
  for (const cap of caps) {
    assert.ok(cap.size[0] < middle.size[0]);
    assert.ok(Math.abs(Math.abs(cap.position[1] - middle.position[1]) - (cap.size[1] + middle.size[1]) / 2) < 1e-8);
  }
  const centre = parts.find(p => p.color === '#5e5542');
  assert.ok(centre.size[0] < caps[0].size[0]);
  assert.ok(centre.position[2] > middle.position[2]);
});
