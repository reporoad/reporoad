import test from 'node:test';
import assert from 'node:assert/strict';
import { Color } from 'three';
import { cabinAssemblyGeometry } from '../lib/cabin-geometry.ts';

test('cabin assembly preserves bounds, linear vertex colors and valid normals', () => {
  const geometry = cabinAssemblyGeometry([
    { position: [1, 2, 3], size: [2, 0.1, 0.2], color: '#806040' },
  ]);
  const box = geometry.boundingBox;
  for (const [actual, expected] of [
    [box.min.x, 0],
    [box.max.x, 2],
    [box.min.y, 1.95],
    [box.max.y, 2.05],
    [box.min.z, 2.9],
    [box.max.z, 3.1],
  ])
    assert.ok(Math.abs(actual - expected) < 1e-6);
  const tint = new Color('#806040');
  const c = geometry.getAttribute('color');
  assert.ok(Math.abs(c.getX(0) - tint.r) < 1e-6);
  assert.ok(Math.abs(c.getY(0) - tint.g) < 1e-6);
  assert.ok(Math.abs(c.getZ(0) - tint.b) < 1e-6);
  const normals = geometry.getAttribute('normal');
  assert.ok([...normals.array].every(Number.isFinite));
  assert.equal(
    geometry.groups.length,
    0,
    'single material draw, not one per block',
  );
  geometry.dispose();
});

test('wood classification is explicit and independent of paint color', () => {
  for (const wood of [false, true]) {
    const geometry = cabinAssemblyGeometry([
      { position: [0, 0, 0], size: [1, 1, 1], color: '#806040', wood },
    ]);
    assert.ok([...geometry.getAttribute('cabinWood').array].every((v) => v === Number(wood)));
    geometry.dispose();
  }
});
