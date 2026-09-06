import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera } from 'three';
import { cabinMirror } from '../lib/cabin-mirror.ts';

test('mirror camera projects equal world lengths equally on the physical glass', () => {
  const camera = new PerspectiveCamera(cabinMirror.verticalFov, cabinMirror.aspect);
  const projection = camera.projectionMatrix.elements;
  const horizontal = projection[0] * cabinMirror.width;
  const vertical = projection[5] * cabinMirror.height;
  assert.ok(Math.abs(horizontal - vertical) < 1e-9);
  assert.ok(Math.abs(cabinMirror.targetWidth / cabinMirror.targetHeight - cabinMirror.aspect) < 0.02);
  assert.ok(cabinMirror.targetWidth * cabinMirror.targetHeight <= 384 * 144);
});
