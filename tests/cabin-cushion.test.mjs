import test from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry } from 'three';
import { cabinBolsterGeometry, cabinCushionGeometry, shadeCabinFabric } from '../lib/cabin-cushion.ts';

test('joined bolsters are closed mirrored surfaces within the original envelope', () => {
  for (const side of [-1, 1]) {
    const geometry = cabinBolsterGeometry(side);
    const bounds = geometry.boundingBox;
    assert.ok(Math.abs(bounds.min.x - (side > 0 ? 0.351 : -0.403)) < 1e-6);
    assert.ok(Math.abs(bounds.max.x - (side > 0 ? 0.403 : -0.351)) < 1e-6);
    assert.ok(Math.abs(bounds.min.y - 0.05) < 1e-6);
    assert.ok(Math.abs(bounds.max.y - 0.24) < 1e-6);
    assert.ok(Math.abs(bounds.min.z + 0.24) < 1e-6);
    assert.ok(Math.abs(bounds.max.z + 0.02) < 1e-6);
    const p = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const shoulderLevels = new Set();
    for (let i = 0; i < p.count; i++) {
      if (normals.getY(i) > 0.99) shoulderLevels.add(Math.round(p.getY(i) * 1e6));
    }
    assert.deepEqual([...shoulderLevels].sort((a, b) => a - b), [205000, 240000]);
    const keys = Array.from({length:p.count}, (_,i) =>
      [p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(','));
    const edges = new Map();
    for(let i=0;i<p.count;i+=3) for(const [a,b] of [[0,1],[1,2],[2,0]]) {
      const key=[keys[i+a],keys[i+b]].sort().join('|');
      edges.set(key,(edges.get(key)??0)+1);
    }
    assert.ok([...edges.values()].every(count=>count===2));
    assert.ok([...geometry.getAttribute('normal').array].every(Number.isFinite));
    geometry.dispose();
  }
});

test('upholstered base shading preserves geometry and keeps tops lighter than sides', () => {
  const geometry = new BoxGeometry(0.74, 0.46, 0.28);
  const positions = [...geometry.getAttribute('position').array];
  const normals = [...geometry.getAttribute('normal').array];
  assert.equal(shadeCabinFabric(geometry), geometry);
  assert.deepEqual([...geometry.getAttribute('position').array], positions);
  assert.deepEqual([...geometry.getAttribute('normal').array], normals);
  const colors = geometry.getAttribute('color');
  const normal = geometry.getAttribute('normal');
  for (let i = 0; i < colors.count; i++) {
    if (normal.getY(i) === 1) assert.equal(colors.getX(i), 1);
    else {
      assert.equal(colors.getX(i), 0.5);
      assert.ok(colors.getY(i) > colors.getX(i));
    }
  }
  assert.ok([...geometry.getAttribute('cabinWood').array].every((v) => v === 0));
  geometry.dispose();
});

test('padded seat top retains its footprint and a bounded shallow crown', () => {
  const geometry = cabinCushionGeometry([0.71, 0.06, 0.43]);
  const box = geometry.boundingBox;
  assert.ok(Math.abs(box.min.x + 0.355) < 1e-6);
  assert.ok(Math.abs(box.max.x - 0.355) < 1e-6);
  assert.ok(Math.abs(box.min.z + 0.215) < 1e-6);
  assert.ok(Math.abs(box.max.z - 0.215) < 1e-6);
  assert.ok(box.max.y > 0.04 && box.max.y <= 0.042001);
  assert.ok([...geometry.getAttribute('normal').array].every(Number.isFinite));
  const colors = geometry.getAttribute('color');
  const wood = geometry.getAttribute('cabinWood');
  assert.ok([...wood.array].every((v) => v === 0));
  assert.ok([...colors.array].every((v) => v >= 0.5 && v <= 1));
  assert.ok([...colors.array].some((v) => v === 1), 'top keeps its original tint');
  assert.ok([...colors.array].some((v) => v === 0.5), 'skirt has its darker tint');
  geometry.dispose();
});

test('curved cushion has no open triangle edges after joining face boundaries', () => {
  const geometry = cabinCushionGeometry([0.71, 0.06, 0.21]);
  const p = geometry.getAttribute('position');
  const keys = Array.from({ length: p.count }, (_, i) =>
    [p.getX(i), p.getY(i), p.getZ(i)].map((v) => Math.round(v * 1e6)).join(','));
  const indices = geometry.getIndex().array;
  const edges = new Map();
  for (let i = 0; i < indices.length; i += 3) {
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
      const key = [keys[indices[i + a]], keys[indices[i + b]]].sort().join('|');
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  assert.ok([...edges.values()].every((count) => count === 2));
  geometry.dispose();
});
