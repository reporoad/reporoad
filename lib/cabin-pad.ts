import { BoxGeometry, Float32BufferAttribute } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function moldedPadGeometry() {
  // Non-uniform grid places vertices at the recess and bevel boundaries,
  // keeping adjoining faces watertight without a dense full-pad tessellation.
  const xs = [-2.6, -2.592, -1.10, -1.08, -1.06, -.74, -.72, -.70,
    -.14, -.13, -.12, .12, .13, .14, 2.592, 2.6];
  const ys = [-.04, -.032, .032, .04];
  const zs = [-.4, -.392, -.04, -.02, 0, .14, .15, .16, .392, .4];
  const g = new BoxGeometry(5.2, .08, .8, xs.length - 1, ys.length - 1, zs.length - 1);
  const p = g.getAttribute('position'), n = g.getAttribute('normal');
  const colors = new Float32Array(p.count * 3).fill(1);
  const sample = (v: number, lo: number, hi: number) => {
    const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
    return [t * t * (3 - 2 * t), 6 * t * (1 - t) / (hi - lo)];
  };
  for (let i = 0; i < p.count; i++) {
    let x = xs[Math.round((p.getX(i) / 5.2 + .5) * (xs.length - 1))];
    let y = ys[Math.round((p.getY(i) / .08 + .5) * (ys.length - 1))];
    let z = zs[Math.round((p.getZ(i) / .8 + .5) * (zs.length - 1))];
    const qx = Math.max(-2.592, Math.min(2.592, x));
    const qy = Math.max(-.032, Math.min(.032, y));
    const qz = Math.max(-.392, Math.min(.392, z));
    const d = Math.hypot(x - qx, y - qy, z - qz);
    let nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    if (d > 0) {
      nx = (x - qx) / d; ny = (y - qy) / d; nz = (z - qz) / d;
      x = qx + nx * .008; y = qy + ny * .008; z = qz + nz * .008;
    }
    if (ny > .5) {
      const [a, da] = sample(x, -1.10, -1.06);
      const [b, db] = sample(x, -.74, -.70);
      const [c, dc] = sample(z, -.04, 0);
      const [e, de] = sample(z, .14, .16);
      const fx = a * (1 - b), fz = c * (1 - e);
      y -= .006 * fx * fz;
      const inset = fx * fz;
      colors.set([1 - .68 * inset, 1 - .60 * inset, 1 - .42 * inset], i * 3);
      nx += .006 * (da * (1 - b) - a * db) * fz;
      nz += .006 * fx * (dc * (1 - e) - c * de);
      // A second, shallower molded detail above the radio matches the
      // reference's broad panel work. It belongs to this closed mesh rather
      // than a coplanar decal, so there is no z-fighting in the moving cabin.
      const [ra, rda] = sample(x, -.14, -.12);
      const [rb, rdb] = sample(x, .12, .14);
      const radioInset = ra * (1 - rb) * fz;
      y -= .003 * radioInset;
      colors[i * 3] *= 1 - .24 * radioInset;
      colors[i * 3 + 1] *= 1 - .22 * radioInset;
      colors[i * 3 + 2] *= 1 - .18 * radioInset;
      nx += .003 * (rda * (1 - rb) - ra * rdb) * fz;
      nz += .003 * ra * (1 - rb) * (dc * (1 - e) - c * de);
    }
    p.setXYZ(i, x, y, z);
    const length = Math.hypot(nx, ny, nz);
    n.setXYZ(i, nx / length, ny / length, nz / length);
  }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  g.setAttribute('cabinWood', new Float32BufferAttribute(new Float32Array(p.count), 1));
  return g;
}

/** Continuous shallow pad; slope is shared by the two raised panel seams. */
export function cabinPadGeometry(seam = false) {
  const geometry = !seam ? moldedPadGeometry() : new RoundedBoxGeometry(
    seam ? 0.009 : 5.2,
    seam ? 0.003 : 0.08,
    0.8,
    1,
    seam ? 0.001 : 0.008,
  );
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  for (let i = 0; i < position.count; i++) {
    position.setY(i, position.getY(i) + position.getZ(i) * 0.143);
    const nx = normal.getX(i), ny = normal.getY(i), nz = normal.getZ(i) - normal.getY(i) * .143;
    const length = Math.hypot(nx, ny, nz);
    normal.setXYZ(i, nx / length, ny / length, nz / length);
  }
  position.needsUpdate = true;
  normal.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
