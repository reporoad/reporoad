import type { VoxelPart } from './voxel-models.ts';

/** Ground-floor detail only: cost does not grow with the repository's star count. */
export function storefrontDetails(garden: boolean, winter: boolean) {
  const parts: VoxelPart[] = [];
  const lights: VoxelPart[] = [];
  const add = (position: VoxelPart['position'], size: VoxelPart['size'], color: string) =>
    parts.push({ position, size, color });
  // Porch boards and a dark nosing ground the building, rather than a flat slab.
  for (let i = 0; i < 8; i++)
    add([0, 0.28, 2.35 + i * 0.18], [5.7, 0.09, 0.168], i % 3 ? '#786047' : '#876e50');
  add([0, 0.19, 3.89], [5.9, 0.18, 0.14], '#594332');
  // A pair of small boxed lanterns: glowing glass, no per-building point lights.
  for (const side of [-1, 1]) {
    const x = side * 2.45;
    add([x, 1.82, 2.2], [0.14, 0.52, 0.13], '#473b2c');
    add([x, 2.01, 2.43], [0.12, 0.08, 0.46], '#473b2c');
    lights.push({ position: [x, 1.76, 2.62], size: [0.22, 0.3, 0.21], color: '#ffc778' });
    for (const y of [1.57, 1.95]) add([x, y, 2.62], [0.34, 0.07, 0.32], '#46382a');
    for (const dx of [-0.135, 0.135]) add([x + dx, 1.76, 2.745], [0.035, 0.34, 0.035], '#58452f');
    if (!garden) continue;
    add([side * 1.65, 0.7, 2.4], [1.52, 0.27, 0.42], '#72513a');
    add([side * 1.65, 0.84, 2.4], [1.6, 0.055, 0.46], '#a37d51');
    for (let i = 0; i < 5; i++) {
      const px = side * 1.65 - 0.57 + i * 0.28;
      add([px, 0.96, 2.4], [0.25, 0.2 + (i % 2) * 0.1, 0.3], winter ? '#d4ddd6' : '#637c43');
      if (!winter) add([px, 1.12 + (i % 2) * 0.08, 2.46], [0.13, 0.1, 0.13], i % 2 ? '#cf9da9' : '#ebd1a1');
    }
  }
  return { parts, lights };
}
