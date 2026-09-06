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
  pass.dispose();
  depth.dispose();
});
