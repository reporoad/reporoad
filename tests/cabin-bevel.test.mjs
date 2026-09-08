import test from 'node:test';
import assert from 'node:assert/strict';
import { cabinAssemblyGeometry } from '../lib/cabin-geometry.ts';

test('custom padded bevels preserve the part envelope and finite normals', () => {
  for (const bevel of [undefined, 0.014, 1]) {
    const geometry = cabinAssemblyGeometry([{position:[0,0,0],size:[0.3,0.25,0.085],color:'#807b69',bevel}]);
    const box = geometry.boundingBox;
    for (const [axis,half] of [['x',0.15],['y',0.125],['z',0.0425]]) {
      assert.ok(Math.abs(box.min[axis]+half)<1e-6);
      assert.ok(Math.abs(box.max[axis]-half)<1e-6);
    }
    assert.ok([...geometry.getAttribute('normal').array].every(Number.isFinite));
    geometry.dispose();
  }
});
