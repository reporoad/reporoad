import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneLighting, cabinLighting } from '../lib/scene-lighting.ts';
import { storefrontDetails } from '../lib/storefront-details.ts';

test('lighting keeps night readable and reduces direct sun in rain', () => {
  const noon = sceneLighting(1, Math.PI / 2, 0);
  const rain = sceneLighting(1, Math.PI / 2, 1);
  const night = sceneLighting(0, -Math.PI / 2, 0);
  assert.ok(noon.sunlight > rain.sunlight);
  assert.ok(rain.fill >= noon.fill);
  assert.ok(night.fill >= 0.4);
  assert.ok(night.sunlight < noon.sunlight);
  assert.equal(sceneLighting(1, 0.2, 0).golden > noon.golden, true);
  for (let i = 0; i < 1440; i++) {
    const a = i / 1440 * Math.PI * 2;
    const s = sceneLighting(Math.max(0, Math.sin(a)), a, 0.5);
    assert.ok(Object.values(s).every(Number.isFinite));
    assert.ok(s.fogFar > s.fogNear && s.fogNear > 0);
    const next = sceneLighting(Math.max(0, Math.sin(a + 0.001)), a + 0.001, 0.5);
    assert.ok(Math.abs(s.sunlight - next.sunlight) < 0.01);
  }
});

test('storefront detail is deterministic, bounded and respects gardens/seasons', () => {
  for (const garden of [false, true]) for (const winter of [false, true]) {
    const model = storefrontDetails(garden, winter);
    assert.deepEqual(model, storefrontDetails(garden, winter));
    assert.equal(model.lights.length, 2);
    assert.ok(model.parts.length < 60);
    for (const p of [...model.parts, ...model.lights]) {
      assert.ok(p.position.every(Number.isFinite));
      assert.ok(p.size.every(n => Number.isFinite(n) && n > 0));
      assert.ok(Math.abs(p.position[0]) + p.size[0] / 2 < 3.1);
      assert.match(p.color, /^#[0-9a-f]{6}$/i);
    }
  }
  assert.ok(storefrontDetails(true, false).parts.length > storefrontDetails(false, false).parts.length);
  assert.ok(!storefrontDetails(true, true).parts.some(p => p.color === '#cf9da9'));
});

test('cabin window light softens in wet weather and turns off at night', () => {
  const sun = cabinLighting(1, 0), rain = cabinLighting(1, 1);
  assert.ok(sun.key > rain.key * 5);
  assert.ok(rain.frontFill > sun.frontFill);
  assert.ok(rain.windowFill > sun.windowFill);
  assert.ok(Object.values(cabinLighting(0, 0)).every(n => n === 0));
  for (const wet of [0, 0.5, 1, 2]) {
    const half = cabinLighting(0.5, wet), full = cabinLighting(1, wet);
    for (const key of Object.keys(full)) assert.equal(half[key], full[key] / 2);
  }
});
