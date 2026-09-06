import { BoxGeometry, ExtrudeGeometry, Shape, Float32BufferAttribute, type BufferGeometry } from 'three';

/** A single upholstered shoulder step, with no overlapping end faces. */
export function cabinBolsterGeometry(side: -1 | 1) {
  const outline = [
    [0.351, 0.1], [0.351, 0.24], [0.379, 0.24],
    [0.379, 0.205], [0.403, 0.205], [0.403, 0.05],
    [0.375, 0.05], [0.375, 0.1],
  ];
  const shape = new Shape();
  outline.forEach(([x, y], i) => {
    if (i === 0) shape.moveTo(x * side, y);
    else shape.lineTo(x * side, y);
  });
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.22, steps: 1, bevelEnabled: false, curveSegments: 1,
  });
  geometry.translate(0, 0, -0.24);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return shadeCabinFabric(geometry);
}

/** The same restrained side-face tint for the upholstered base and bolsters. */
export function shadeCabinFabric<T extends BufferGeometry>(geometry: T): T {
  const normals = geometry.getAttribute('normal');
  const colors = new Float32Array(normals.count * 3);
  for (let i = 0; i < normals.count; i++) {
    const top = Math.max(0, Math.min(1, normals.getY(i) / 0.8));
    colors.set([0.5 + top * 0.5, 0.62 + top * 0.38, 0.6 + top * 0.4], i * 3);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('cabinWood', new Float32BufferAttribute(new Float32Array(normals.count), 1));
  return geometry;
}

/** A shallow padded crown, with the perimeter fixed against the voxel bolster. */
export function cabinCushionGeometry(size: [number, number, number]) {
  // Matching subdivisions on every shared edge avoid displaced T-junctions.
  const geometry = new BoxGeometry(...size, 24, 4, 16);
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const colors = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const radius = 0.005;
    const p = [positions.getX(i), positions.getY(i), positions.getZ(i)];
    const inner = p.map((v, axis) =>
      Math.max(-size[axis] / 2 + radius, Math.min(size[axis] / 2 - radius, v)),
    );
    const delta = p.map((v, axis) => v - inner[axis]);
    const distance = Math.hypot(...delta);
    positions.setXYZ(
      i,
      ...(inner.map((v, axis) => v + (delta[axis] / distance) * radius) as [
        number,
        number,
        number,
      ]),
    );
    normals.setXYZ(
      i,
      delta[0] / distance,
      delta[1] / distance,
      delta[2] / distance,
    );
    const top = Math.max(0, Math.min(1, normals.getY(i) / 0.8));
    colors[i * 3] = 0.5 + top * 0.5;
    colors[i * 3 + 1] = 0.62 + top * 0.38;
    colors[i * 3 + 2] = 0.6 + top * 0.4;
    if (normals.getY(i) < 0.5) continue;
    const u = Math.min(1, Math.abs(positions.getX(i)) / (size[0] / 2));
    const v = Math.min(1, Math.abs(positions.getZ(i)) / (size[2] / 2));
    const crown = 0.012 * (1 - u * u) * (1 - v * v);
    positions.setY(i, positions.getY(i) + crown);
    const dx =
      ((-0.024 * positions.getX(i)) / (size[0] / 2) ** 2) * (1 - v * v);
    const dz =
      ((-0.024 * positions.getZ(i)) / (size[2] / 2) ** 2) * (1 - u * u);
    const ny = normals.getY(i);
    const nx = normals.getX(i) - dx * ny;
    const nz = normals.getZ(i) - dz * ny;
    const length = Math.hypot(nx, ny, nz);
    normals.setXYZ(i, nx / length, ny / length, nz / length);
  }
  positions.needsUpdate = true;
  normals.needsUpdate = true;
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute(
    'cabinWood',
    new Float32BufferAttribute(new Float32Array(positions.count), 1),
  );
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
