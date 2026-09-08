export type VoxelPart = {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  wood?: boolean;
  rubber?: boolean;
  lit?: boolean;
  bevel?: number;
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
  const phase = noise(seed + 71) * Math.PI * 2;
  const leanX = (noise(seed + 82) - 0.5) * 0.34;
  const leanZ = (noise(seed + 93) - 0.5) * 0.34;
  for (let x = -7; x <= 7; x++)
    for (let y = 0; y < 14; y++)
      for (let z = -7; z <= 7; z++) {
        const n = noise(x * 97 + y * 31 + z * 7 + seed * 13);
        const xx = x * 0.24,
          zz = z * 0.24,
          yy = 2 + y * 0.24;
        const baseRadius = pine
          ? 1.75 - y * 0.104
          : 1.65 * Math.sqrt(Math.max(0, 1 - ((yy - 3.45) / 1.8) ** 2));
        // Broad lobes, not a perfect clipped sphere. Every tree keeps the
        // same seeded silhouette when sections recycle or the page reloads.
        const angle = Math.atan2(zz, xx);
        const crown = pine
          ? 1 + 0.09 * Math.sin(y * 1.6 + phase)
          : 1 + 0.12 * Math.sin(angle * 3 + phase + y * 0.18)
            + 0.06 * Math.cos(angle * 5 - phase);
        const radius = baseRadius * crown;
        const radial = Math.hypot(xx, zz);
        // Keep only the crown shell: hidden interior cubes add cost, not detail.
        if (
          radial > radius + (n - 0.5) * 0.3 ||
          (radial < radius - 0.42 && y > 0 && y < 13)
        )
          continue;
        add(
          [xx + leanX * y / 13, yy, zz + leanZ * y / 13],
          [0.245, 0.245, 0.245],
          // Coherent patches keep leaves from looking like random checkerboard tiles.
          palette[Math.floor(noise(Math.floor(x / 2) * 97 + Math.floor(y / 2) * 31 + Math.floor(z / 2) * 7 + seed * 13) * palette.length)],
        );
      }
  return parts;
}

export function steeringWheelModel(): VoxelPart[] {
  const parts: VoxelPart[] = [];
  const step = 0.045;
  const rim: {
    left: number;
    right: number;
    bottom: number;
    top: number;
    color: string;
  }[] = [];
  for (let y = -8; y <= 8; y++) {
    const row: number[] = [];
    for (let x = -8; x <= 8; x++) {
      // Longer lower corner steps narrow the bottom grip beneath the horn.
      const cornerLimit = y < 0 ? 11 : 13;
      const outer =
        Math.max(Math.abs(x), Math.abs(y)) <= 8 &&
        Math.abs(x) + Math.abs(y) <= cornerLimit;
      const inner =
        Math.max(Math.abs(x), Math.abs(y)) <= 7 &&
        Math.abs(x) + Math.abs(y) <= cornerLimit - 1;
      if (!outer || inner) continue;
      row.push(x);
    }
    // Merge each straight grip without changing the stepped rim silhouette.
    for (let i = 0; i < row.length;) {
      const left = row[i];
      let right = left;
      while (++i < row.length && row[i] === right + 1) right = row[i];
      const color = y > 3 ? '#8d7357' : '#6d6658';
      const previous = rim.find(
        (r) =>
          r.left === left &&
          r.right === right &&
          r.top === y - 1 &&
          r.color === color,
      );
      if (previous) previous.top = y;
      else rim.push({ left, right, bottom: y, top: y, color });
    }
  }
  // Raise the upper opening and flatten the lower bowl independently of the
  // horn. This matches the reference silhouette without moving the controls.
  const rimY = (y: number) => y < -0.07 ? -0.07 + (y + 0.07) * 0.76 : y > 0 ? y * 1.17 : y;
  for (const r of rim) {
    // The upper hand grip is deeper below its fixed crown than the corner steps.
    const bottom = rimY((r.bottom - 0.5) * step) - (r.top === 8 && r.bottom === 8 ? 0.022 : 0);
    const top = rimY((r.top + 0.5) * step);
    parts.push({
      position: [
        ((r.left + r.right) * step) / 2,
        (bottom + top) / 2,
        0,
      ],
      size: [
        (r.right - r.left + 1) * step + 0.001,
        top - bottom + 0.001,
        0.085,
      ],
      color: r.color,
    });
  }
  parts.push(
    {
      position: [0.018, -0.06, 0.015],
      size: [0.3, 0.25, 0.085],
      color: '#8b795c',
      bevel: 0.014,
    },
    {
      position: [0.018, -0.055, 0.059],
      size: [0.224, 0.22, 0.016],
      color: '#857363',
      bevel: 0.006,
    },
    { position: [0, -0.07, 0], size: [0.6, 0.085, 0.065], color: '#79705e' },
    { position: [0, -0.17, 0], size: [0.05, 0.28, 0.055], color: '#79705e' },
    // A stepped column cover sits behind the horn pad and lower spoke.
    {
      position: [0.018, -0.205, -0.03],
      size: [0.14, 0.20, 0.12],
      color: '#454334',
    },
    {
      position: [0.018, -0.16, 0.025],
      size: [0.19, 0.04, 0.025],
      color: '#5b5343',
    },
    {
      position: [0.018, -0.215, 0.015],
      size: [0.17, 0.035, 0.035],
      color: '#4c483a',
    },
    {
      position: [0.018, -0.055, 0.074],
      size: [0.065, 0.055, 0.014],
      color: '#87816c',
    },
    {
      position: [0.018, -0.055, 0.084],
      size: [0.026, 0.048, 0.01],
      color: '#5e5542',
    },
    {
      position: [0.018, -0.055, 0.091],
      size: [0.01, 0.017, 0.005],
      color: '#ae9470',
    },
  );
  // Inset stepped emblem: clipped corners instead of a bright square plate.
  for (const side of [-1, 1])
    parts.push({
      position: [0.018, -0.055 + side * 0.0375, 0.074],
      size: [0.043, 0.02, 0.014],
      color: '#87816c',
    });
  for (const side of [-1, 1]) {
    parts.push({
      position: [0.018 + side * 0.121, -0.055, 0.059],
      size: [0.018, 0.176, 0.016],
      color: '#857363',
    });
    parts.push({
      position: [0.018 + side * 0.128, -0.055, 0.071],
      size: [0.006, 0.176, 0.008],
      color: '#89755f',
    });
    parts.push({
      position: [0.018, -0.055 + side * 0.108, 0.071],
      size: [0.224, 0.006, 0.008],
      color: '#89755f',
    });
    for (const vertical of [-1, 1]) {
      parts.push({
        position: [0.018 + side * 0.119, -0.055 + vertical * 0.088, 0.071],
        size: [0.024, 0.006, 0.008],
        color: '#89755f',
      });
      parts.push({
        position: [0.018 + side * 0.11, -0.055 + vertical * 0.098, 0.071],
        size: [0.006, 0.026, 0.008],
        color: '#89755f',
      });
    }
  }
  // The pad and emblem have independent proportions. The broad stepped badge
  // stays readable at driver-eye distance without widening the padded face.
  for (const part of parts) {
    if (part.position[2] <= 0) continue;
    const widthScale = part.position[2] >= 0.074 ? 1.65
      : part.position[1] <= -0.16 ? 1.04 : 0.84;
    part.position[0] = 0.018 + (part.position[0] - 0.018) * widthScale;
    part.size[0] *= widthScale;
    // Recessed face is shorter than its outer padding; retain the badge size.
    if (part.position[2] >= 0.059 && part.position[2] < 0.074) {
      part.position[1] = -0.055 + (part.position[1] + 0.055) * 0.82;
      part.size[1] *= 0.82;
    }
  }
  // Centre the padded hub in the opening without shifting the rim or spokes.
  for (const part of parts) {
    if (part.position[2] !== 0) part.position[0] -= 0.026;
  }
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
    if (i % 8 === 0) {
      // Uneven low tussocks bridge the bare gravel between isolated flower stems.
      // Stay inside the verge and away from the road/chicken crossing lane.
      const width = 0.2 + noise(n + 21) * 0.2;
      add([x, 0.13, z], [width, 0.26, 0.25],
        season === 'Winter' ? '#d0d9d0' : season === 'Autumn' ? '#9c8b4d' : '#657d40');
      add([x + side * 0.12, 0.09, z + 0.1], [0.18, 0.18, 0.22],
        season === 'Winter' ? '#e0e5dd' : '#84934e');
    }
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
  // Low split-rail borders frame the flower beds. The final eight metres stay
  // open for each building's entrance; fences never cross the driving lane.
  for (const side of [-1, 1]) {
    for (let post = 0; post < 4; post++) {
      const z = -3 - post * 7;
      const height = 0.86 + noise(seed * 19 + post) * 0.1;
      add([side * 6.25, height / 2, z], [0.18, height, 0.18], '#6a5138');
      add([side * 6.25, height, z], [0.21, 0.07, 0.21], season === 'Winter' ? '#dce3d9' : '#92734b');
      if (post === 3) continue;
      for (const y of [0.31, 0.67])
        add([side * 6.25, y, z - 3.5], [0.09, 0.1, 7], '#826541');
    }
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
