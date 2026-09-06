import test from 'node:test';
import assert from 'node:assert/strict';
import { cabinPadGeometry } from '../lib/cabin-pad.ts';

test('dashboard pad and seams follow one continuous slope with finite normals', () => {
  for (const seam of [false, true]) {
    const geometry = cabinPadGeometry(seam);
    const p = geometry.getAttribute('position');
    const n = geometry.getAttribute('normal');
    const halfHeight = seam ? 0.0015 : 0.04;
    for (let i = 0; i < p.count; i++) {
      assert.ok(Math.abs(p.getY(i) - p.getZ(i) * 0.143) <= halfHeight + 1e-6);
      assert.ok([n.getX(i), n.getY(i), n.getZ(i)].every(Number.isFinite));
    }
    assert.ok(geometry.boundingSphere.radius > 0);
    geometry.dispose();
  }
});

test('molded pad has a bounded six-millimetre recess and closed triangle edges', () => {
  const g = cabinPadGeometry();
  const p = g.getAttribute('position'), n = g.getAttribute('normal');
  let recessed = 0;
  const keys = Array.from({length:p.count}, (_,i) => {
    const x=p.getX(i), y=p.getY(i)-p.getZ(i)*.143, z=p.getZ(i);
    if(n.getY(i)>.8 && x>=-1.061 && x<=-.739 && z>=-.001 && z<=.141) {
      assert.ok(Math.abs(y-.034)<1e-6);
      recessed++;
    }
    assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-6);
    return [x,p.getY(i),z].map(v=>Math.round(v*1e6)).join(',');
  });
  assert.ok(recessed>=4);
  const colors=g.getAttribute('color');
  assert.ok([...colors.array].every(v=>v>=.319999 && v<=1));
  assert.ok([...colors.array].some(v=>Math.abs(v-.32)<1e-6));
  assert.ok([...colors.array].some(v=>Math.abs(v-.40)<1e-6));
  assert.ok([...colors.array].some(v=>Math.abs(v-.58)<1e-6));
  assert.ok([...g.getAttribute('cabinWood').array].every(v=>v===0));
  assert.ok(p.count<1000, 'local grid keeps the pad lightweight');
  const indices=g.getIndex().array,edges=new Map();
  for(let i=0;i<indices.length;i+=3)for(const [a,b] of [[0,1],[1,2],[2,0]]) {
    const key=[keys[indices[i+a]],keys[indices[i+b]]].sort().join('|');
    edges.set(key,(edges.get(key)??0)+1);
  }
  assert.ok([...edges.values()].every(v=>v===2));
  g.dispose();
});
