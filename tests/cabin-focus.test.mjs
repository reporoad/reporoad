import test from 'node:test';
import assert from 'node:assert/strict';
import { DepthTexture } from 'three';
import { cabinFocus } from '../components/cabin-focus.ts';

test('foreground focus samples the live depth attachment, not a cloned empty texture', () => {
  const depth = new DepthTexture(16, 16);
  const pass = cabinFocus(depth, 0.1, 500);
  assert.equal(pass.uniforms.tDepth.value, depth);
  assert.equal(pass.uniforms.cameraNear.value, 0.1);
  assert.equal(pass.uniforms.cameraFar.value, 500);
  assert.ok(pass.uniforms.focusRange.value.x < 0.8, 'nearest upholstery can soften');
  assert.ok(pass.uniforms.focusRange.value.y < 1.05, 'wheel and instrument trim stay outside the blur range');
  assert.ok(pass.uniforms.focusRange.value.x < pass.uniforms.focusRange.value.y);
  pass.dispose();
  depth.dispose();
});
