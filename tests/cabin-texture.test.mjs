import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('paint detail asset ships with the project as a bounded PNG', () => {
  const png = readFileSync(new URL('../public/textures/cabin-patina-v1.png', import.meta.url));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.ok(width >= 256 && width <= 2048);
  assert.equal(width, height);
  assert.ok(png.length < 3 * 1024 * 1024);
});
