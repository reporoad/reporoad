import { BufferGeometry, Color, Float32BufferAttribute } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { VoxelPart } from './voxel-models.ts';

/** One draw call, with bevels measured in metres rather than scaled cube UVs. */
export function cabinAssemblyGeometry(parts: VoxelPart[]): BufferGeometry {
  if (!parts.length) return new BufferGeometry();
  const geometries = parts.map(({ position, size, color, wood = false }) => {
    const geometry = new RoundedBoxGeometry(
      ...size,
      1,
      Math.min(0.005, Math.min(...size) * 0.15),
    );
    geometry.translate(...position);
    const tint = new Color(color);
    const colors = new Float32Array(
      geometry.getAttribute('position').count * 3,
    );
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = tint.r;
      colors[i + 1] = tint.g;
      colors[i + 2] = tint.b;
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.setAttribute(
      'cabinWood',
      new Float32BufferAttribute(
        new Float32Array(colors.length / 3).fill(wood ? 1 : 0),
        1,
      ),
    );
    return geometry;
  });
  const merged = mergeGeometries(geometries, false)!;
  for (const geometry of geometries) geometry.dispose();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}
