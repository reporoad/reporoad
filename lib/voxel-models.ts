export type VoxelPart = {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
};
export const noise = (n: number) => {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

export function treeModel(
  pine: boolean,
  season: string,
  seed = 0,
): VoxelPart[] {
  const parts: VoxelPart[] = [];
  const add = (
    position: VoxelPart['position'],
    size: VoxelPart['size'],
    color: string,
  ) => parts.push({ position, size, color });
  for (let y = 0; y < 12; y++)
    add(
      [0, y * 0.28 + 0.14, 0],
      [0.3 + (y < 3 ? 0.08 : 0), 0.28, 0.3],
      y % 3 ? '#735437' : '#846344',
    );
  for (const side of [-1, 1]) {
    add([side * 0.4, 2.5, 0], [0.9, 0.17, 0.18], '#715237');
    add([0, 2.8, side * 0.35], [0.16, 0.18, 0.8], '#715237');
  }
  const palette =
    season === 'Winter'
      ? ['#cfdacf', '#e2e6d8', '#9fac99']
      : season === 'Autumn'
        ? ['#b7893f', '#a76c35', '#c7a251']
        : season === 'Spring'
          ? ['#789647', '#98a85b', '#adad6f']
          : pine
            ? ['#627b3d', '#82964d', '#4d6737']
            : ['#819342', '#a0ab58', '#657c3b'];
  for (let x = -7; x <= 7; x++)
    for (let y = 0; y < 14; y++)
      for (let z = -7; z <= 7; z++) {
        const n = noise(x * 97 + y * 31 + z * 7 + seed * 13);
        const xx = x * 0.24,
          zz = z * 0.24,
          yy = 2 + y * 0.24;
        const radius = pine
          ? 1.75 - y * 0.104
          : 1.65 * Math.sqrt(Math.max(0, 1 - ((yy - 3.45) / 1.8) ** 2));
        const radial = Math.hypot(xx, zz);
        // Keep only the crown shell: hidden interior cubes add cost, not detail.
        if (
          radial > radius + (n - 0.5) * 0.3 ||
          (radial < radius - 0.42 && y > 0 && y < 13)
        )
          continue;
        add(
          [xx, yy, zz],
          [0.245, 0.245, 0.245],
          palette[Math.floor(n * palette.length)],
        );
      }
  return parts;
}

export function steeringWheelModel(): VoxelPart[] {
  const parts: VoxelPart[] = [];
  const step = 0.045;
  for (let x = -8; x <= 8; x++)
    for (let y = -8; y <= 8; y++) {
      const r = Math.hypot(x, y);
      if (r > 8 || r < 6.5) continue;
      parts.push({
        position: [x * step, y * step, 0],
        size: [step, step, 0.075],
        color: y > 3 ? '#685e48' : '#494332',
      });
    }
  parts.push(
    { position: [0, 0, 0.015], size: [0.2, 0.14, 0.1], color: '#74694e' },
    { position: [0, 0, 0], size: [0.6, 0.045, 0.055], color: '#71634a' },
    { position: [0, -0.17, 0], size: [0.05, 0.28, 0.055], color: '#71634a' },
    { position: [0, 0, 0.07], size: [0.065, 0.055, 0.01], color: '#aa9770' },
  );
  return parts;
}

export function cloudModel(): VoxelPart[] {
  const parts: VoxelPart[] = [];
  for (let cloud = 0; cloud < 9; cloud++) {
    const x = ((cloud % 3) - 1) * 66 + noise(cloud) * 16;
    const z = -130 - Math.floor(cloud / 3) * 55 - (cloud === 2 ? 80 : 0);
    const y = 32 + noise(cloud + 2) * 15;
    for (let block = 0; block < 14; block++) {
      const n = noise(cloud * 20 + block);
      parts.push({
        position: [
          x + (block % 5) * 4 - 8,
          y + Math.floor(block / 5) * 1.8,
          z + (n - 0.5) * 7,
        ],
        size: [4.5 + n * 3, 2.2 + n * 1.6, 5],
        color: block < 5 ? '#d5d5bd' : '#eeead2',
      });
    }
  }
  return parts;
}

export function vergeModel(season: string, seed = 0): VoxelPart[] {
  const parts: VoxelPart[] = [];
  const add = (
    position: VoxelPart['position'],
    size: VoxelPart['size'],
    color: string,
  ) => parts.push({ position, size, color });
  const petals =
    season === 'Winter'
      ? ['#d8e0d5', '#e6e9df', '#c8d2c6']
      : ['#c5a3c4', '#ece2bd', '#d3ac68', '#a7a1c3'];
  // Dense, irregular verge; low groundcover anchors flowers to the soil.
  for (let i = 0; i < 280; i++) {
    const n = i + seed * 311;
    const side = i % 2 ? 1 : -1;
    const x = side * (4.2 + noise(n + 2) * 1.8),
      z = -noise(n + 6) * 32;
    const h = 0.22 + noise(n + 5) * 0.42;
    add(
      [x, h / 2, z],
      [0.035, h, 0.035],
      season === 'Winter' ? '#b9c7ad' : '#6b853a',
    );
    if (i % 4 === 0)
      add(
        [x, 0.06, z],
        [0.38, 0.13, 0.3],
        season === 'Winter' ? '#d8dfd0' : '#71833f',
      );
    add(
      [x + 0.055, h * 0.55, z],
      [0.13, 0.05, 0.06],
      season === 'Winter' ? '#c5d0bb' : '#8d9d50',
    );
    if (i % 3 === 0) continue;
    const color = petals[Math.floor(noise(n + 9) * petals.length)];
    add([x, h, z], [0.065, 0.07, 0.065], '#d5b558');
    for (const [dx, dz] of [
      [-0.08, 0],
      [0.08, 0],
      [0, -0.08],
      [0, 0.08],
    ])
      add([x + dx, h, z + dz], [0.1, 0.055, 0.1], color);
  }
  return parts;
}

// Solid timber siding, end-grain and creeping roof plants. All pieces are
// batched, with a small physical offset rather than coplanar decals.
export function shopDetailModel(seed: number, season: string): VoxelPart[] {
  const parts: VoxelPart[] = [];
  for (let row = 0; row < 16; row++) {
    const y = 0.2 + row * 0.165;
    for (const side of [-1, 1]) {
      parts.push({
        position: [side * 2.92, y, -0.4],
        size: [0.09, 0.15, 4.3],
        color: row % 3 ? '#745b3a' : '#896c45',
      });
      for (const x of [0.82, 2.78])
        parts.push({
          position: [side * x, y, 1.79],
          size: [0.29, 0.15, 0.08],
          color: row % 3 ? '#806039' : '#9a7444',
        });
    }
  }
  for (let i = 0; i < 65; i++) {
    const n = noise(seed * 99 + i * 17);
    const x = -3.15 + (i % 22) * 0.3;
    const y = 2.72 + Math.floor(i / 22) * 0.19;
    if (n < 0.23) continue;
    parts.push({
      position: [x, y, 3.45 - Math.floor(i / 22) * 0.32],
      size: [0.27, 0.24, 0.3],
      color:
        season === 'Winter'
          ? '#d6dbc6'
          : ['#687835', '#879343', '#a1a254'][i % 3],
    });
  }
  return parts;
}
