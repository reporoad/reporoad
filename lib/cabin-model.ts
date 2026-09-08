import type { VoxelPart } from './voxel-models.ts';

/** Joined dashboard assemblies, in driver-eye coordinates (metres). */
export function cabinDashboardModel(): VoxelPart[] {
  const parts: VoxelPart[] = [];
  const add = (
    position: VoxelPart['position'],
    size: VoxelPart['size'],
    color: string,
    wood = color === '#705139',
  ) => parts.push({ position, size, color, wood });
  const olive = '#77745a',
    edge = '#424535',
    shadow = '#24291f',
    wood = '#705139';
  add([0, -0.94, -1.83], [5.2, 0.76, 0.66], edge);
  add([0, -0.64, -1.6], [5.2, 0.38, 0.06], '#545740');
  add([0, -0.53, -2.16], [5.2, 0.045, 0.14], '#30392b');
  // Joined rubber upstand and a narrow weathered crown at the glass base.
  add([0, -0.495, -2.19], [5.2, 0.03, 0.08], '#292f25');
  add([0, -0.479, -2.195], [5.2, 0.008, 0.04], '#555340');
  // The upper pad is a continuous beveled mesh in VoxelCabin.
  add([0, -0.461, -1.52], [5.2, 0.035, 0.06], '#565b43');
  // Recessed passenger glovebox, not a thin board floating above the footwell.
  add([-0.745, -0.5775, -1.48], [0.95, 0.285, 0.08], olive);
  add([-0.745, -0.735, -1.44], [0.95, 0.03, 0.035], '#454734');
  add([-0.745, -0.761, -1.445], [0.95, 0.018, 0.025], shadow);
  add([-0.745, -0.875, -1.43], [0.95, 0.21, 0.03], '#34362a');
  for (const x of [-1.22, -0.27])
    add([x, -0.5775, -1.434], [0.016, 0.285, 0.025], shadow);
  add([-0.825, -0.515, -1.426], [0.3145, 0.04, 0.02], '#464735');
  add([-0.995, -0.515, -1.421], [0.046, 0.058, 0.018], '#303225');
  add([-0.995, -0.515, -1.408], [0.032, 0.043, 0.006], '#5f5c46');
  add([-0.655, -0.515, -1.421], [0.018, 0.053, 0.018], '#25291f');
  // Central console: inset radio, lower switch bank, side rails and footwell.
  const consoleStart = parts.length;
  add([0.035, -0.86, -1.48], [0.7, 0.72, 0.1], '#55553f');
  add([0.035, -0.655, -1.44], [0.63, 0.245, 0.055], '#493e30', true);
  add([0.035, -0.65, -1.38], [0.51, 0.2, 0.025], '#292b22');
  add([0.035, -0.82, -1.405], [0.63, 0.034, 0.05], '#302d23');
  add([0.035, -0.865, -1.435], [0.63, 0.115, 0.045], '#493e30', true);
  add([0.035, -1.06, -1.418], [0.63, 0.23, 0.018], '#3a3529', true);
  for (let i = 0; i < 5; i++) {
    const x = -0.16 + i * 0.097;
    add([x, -0.863, -1.394], [0.064, 0.061, 0.045], shadow);
    add(
      [x, -0.858, -1.3745],
      [0.052, 0.049, 0.014],
      i === 4 ? '#703429' : '#343a2e',
    );
    // Subdued voxel markings, joined to the switch face rather than floating.
    const mark = (dx: number, dy: number, width: number, height: number) =>
      add([x + dx, -0.858 + dy, -1.3665], [width, height, 0.006], '#64624b');
    if (i === 0) {
      for (const dy of [-0.008, 0, 0.008]) mark(0, dy, 0.022, 0.003);
    } else if (i === 1) {
      mark(0, 0, 0.004, 0.022);
      mark(0, 0.002, 0.018, 0.005);
    } else if (i === 2) {
      mark(0, -0.009, 0.022, 0.003);
      mark(0, 0.009, 0.022, 0.003);
      for (const dx of [-0.009, 0, 0.009]) mark(dx, 0, 0.003, 0.015);
    } else if (i === 3) {
      mark(0, -0.005, 0.021, 0.004);
      mark(0, 0.005, 0.021, 0.004);
    } else {
      mark(0, 0.01, 0.006, 0.004);
      for (const side of [-1, 1]) {
        mark(side * 0.005, 0.004, 0.004, 0.007);
        mark(side * 0.009, -0.003, 0.004, 0.008);
      }
      mark(0, -0.009, 0.022, 0.003);
    }
  }
  for (const x of [-0.17, 0.25]) {
    add([x, -0.69, -1.3635], [0.054, 0.054, 0.024], '#4c4938');
    add([x, -0.678, -1.349], [0.012, 0.027, 0.012], '#655943');
    add([x, -0.615, -1.37], [0.045, 0.023, 0.011], '#454334');
  }
  for (const x of [-0.32, 0.39])
    add([x, -0.76, -1.39], [0.038, 0.49, 0.08], edge);
  const consoleEnd = parts.length;
  // Binnacle: dark inset gauges, a projecting hood, layered square edges.
  add([0.83, -0.565, -1.57], [0.664, 0.34, 0.14], '#353b2e');
  add([0.83, -0.385, -1.465], [0.728, 0.065, 0.18], '#76745a');
  for (const x of [0.478, 1.182])
    add([x, -0.53, -1.44], [0.064, 0.31, 0.16], '#65634c');
  add([0.83, -0.67, -1.433], [0.688, 0.055, 0.13], '#716b50');
  // Timber at the outer dashboard and physical vent louvres.
  const ventStart = parts.length;
  for (const x of [-1.36, 1.38]) {
    // The backing clears the dash body; separate border rails leave a real
    // opening instead of letting a solid timber box cover the inset louvers.
    add([x, -0.65, -1.421], [0.28, 0.24, 0.01], wood);
    for (const side of [-1, 1])
      add([x + side * 0.105, -0.65, -1.425], [0.07, 0.24, 0.04], wood);
    add([x, -0.543, -1.425], [0.14, 0.026, 0.04], wood);
    add([x, -0.734, -1.425], [0.14, 0.072, 0.04], wood);
    add([x, -0.625, -1.416], [0.13, 0.13, 0.008], shadow);
    for (const side of [-1, 1]) {
      add([x + side * 0.078, -0.625, -1.415], [0.018, 0.19, 0.035], '#5e6049');
      add([x, -0.625 + side * 0.085, -1.415], [0.14, 0.016, 0.035], '#5e6049');
    }
    for (let i = 0; i < 4; i++)
      add([x, -0.678 + i * 0.034, -1.41], [0.13, 0.012, 0.012], '#525543');
    add([x, -0.81, -1.45], [0.28, 0.055, 0.04], '#4b402e');
  }
  for (const part of parts.slice(ventStart)) {
    part.position[1] += 0.1;
    part.position[2] -= 0.08;
  }
  // Lift the central radio and switch bank into the dash, leaving a dark lower console.
  for (const part of parts.slice(consoleStart, consoleEnd))
    part.position[1] += 0.08;
  const fasciaStart = parts.length;
  // Nested fascias and flush corner fasteners give each control a real housing.
  for (const x of [-0.27, 0.34])
    for (const y of [-0.47, -0.685]) {
      add([x, y, -1.376], [0.015, 0.015, 0.008], '#655d48');
      add([x, y, -1.37], [0.01, 0.002, 0.004], '#3e3b2e');
    }
  for (const x of [-0.29, 0.37])
    add([x, -0.579, -1.425], [0.015, 0.228, 0.02], '#514c3a');
  add([0.035, -0.453, -1.436], [0.64, 0.016, 0.036], '#626149');
  add([0.035, -0.699, -1.395], [0.64, 0.015, 0.02], '#272b22');
  // Lower console meets the dark footwell instead of ending in a flat slab.
  add([0.035, -1.075, -1.45], [0.62, 0.18, 0.15], '#30392e');
  add([0.035, -1.04, -1.355], [0.47, 0.075, 0.055], '#1e271f');
  // Match the shallow, high-mounted vintage radio and compact switch bank.
  for (const part of [
    ...parts.slice(consoleStart, consoleEnd),
    ...parts.slice(fasciaStart),
  ]) {
    part.position[0] = (part.position[0] - 0.035) * 0.94 - 0.015;
    part.position[1] = (part.position[1] + 0.57) * 0.82 - 0.535;
    part.size[0] *= 0.94;
    part.size[1] *= 0.82;
  }
  return parts;
}

export function cabinSurroundModel(frameX: number): VoxelPart[] {
  const parts: VoxelPart[] = [];
  const add = (
    position: VoxelPart['position'],
    size: VoxelPart['size'],
    color: string,
    wood = false,
  ) => parts.push({ position, size, color, wood });
  for (const side of [-1, 1]) {
    // Covers wrap the pillar sides as well as the front. Thin face-only
    // patches left the visible inner return as one uninterrupted plank.
    const coverSpans = [1, 2, 1, 1, 2, 1, 3, 1, 2, 2];
    let coverBottom = -0.3975;
    for (let i = 0; i < coverSpans.length; i++) {
      const height = coverSpans[i] * 0.095;
      const palette = ['#736e50', '#62614a', '#827b58'];
      const tint = (i * 7 + Math.floor(i / 3)) % 3;
      // Taller covers have offset fitted joints, not raised face stickers.
      // Keep the complete pillar envelope and the original horizontal gaps.
      const widths = coverSpans[i] > 1
        ? (i % 2 ? [0.086, 0.057] : [0.057, 0.086])
        : [0.145];
      let left = -0.0725;
      widths.forEach((width, column) => {
        add(
          [side * (frameX + left + width / 2), coverBottom + height / 2, -1.95],
          [width, height - 0.005, 0.22],
          palette[(tint + column) % palette.length],
        );
        left += width + 0.002;
      });
      coverBottom += height;
    }
    for (let i = 0; i < 16; i += 4)
      add(
        [side * (frameX - 0.055), -0.35 + i * 0.095, -1.827],
        [0.031, 0.11, 0.028],
        '#777356',
      );
    // Continuous seal backing with flush, subtly varied cover sections.
    add([side * (frameX - 0.1), 0.34, -1.8905], [0.035, 1.46, 0.05], '#343c30');
    for (let i = 0; i < 8; i++)
      add(
        [side * (frameX - 0.1), -0.39 + (i + 0.5) * 0.1825, -1.853],
        [0.035, 0.1805, 0.025],
        ['#414434', '#343c30', '#4a4b39', '#3c4032'][i % 4],
      );
    // A painted inner return, with rubber confined to the rear glass edge.
    add([side * (frameX - 0.0775), 0.08, -1.9625], [0.02, 2.4, 0.065], '#746b4f');
    for (let i = 0; i < 24; i++)
      add(
        [side * (frameX - 0.09), -1.12 + (i + 0.5) * 0.1, -1.9625],
        [0.005, 0.0985, 0.065],
        ['#897650', '#625d45', '#7c7052'][(i * 7 + Math.floor(i / 3)) % 3],
      );
    add([side * (frameX - 0.08), 0.08, -2.0025], [0.025, 2.4, 0.015], '#303932');
    // Small fitted returns build up the upper corner without covering the
    // continuous lower weatherstrip or projecting like separate attached blocks.
    for (let i = 0; i < 3; i++) {
      add(
        [side * (frameX - 0.066), 0.7 + i * 0.12, -1.856],
        [i === 2 ? 0.095 : 0.075, 0.1, 0.025],
        ['#676149', '#555540', '#70684d'][i % 3],
      );
    }
    // Fitted corner tiers taper into the pillar instead of one square cap.
    for (let tier = 0; tier < 3; tier++)
      add(
        [side * (frameX + tier * 0.025), 1.15 - (tier + 0.5) * (0.2 / 3), -1.79],
        [0.23 - tier * 0.05, 0.2 / 3, 0.19],
        ['#554832', '#50432f', '#594b34'][tier],
        true,
      );
    const handleX = side * (frameX - 0.45);
    add([handleX, -0.7, -1.49], [0.1, 0.05, 0.012], '#6e614a');
    add([handleX, -0.7, -1.476], [0.075, 0.035, 0.004], '#383b2d');
    for (const edge of [-1, 1]) {
      add(
        [handleX + edge * 0.045, -0.7, -1.455],
        [0.01, 0.05, 0.05],
        '#9a8865',
      );
      add(
        [handleX, -0.7 + edge * 0.022, -1.455],
        [0.08, 0.006, 0.05],
        '#9a8865',
      );
    }
    // Panel rails along the doors catch the side light.
    for (let j = 0; j < 3; j++)
      add(
        [side * (frameX - 0.45), -0.59 - j * 0.14, -1.52],
        [0.325, 0.105, 0.15],
        j === 1 ? '#796043' : '#62664d',
        j === 1,
      );
  }
  const roofEdges = [-frameX, -0.34, 0.425, frameX];
  for (let i = 0; i < roofEdges.length - 1; i++) {
    const width = roofEdges[i + 1] - roofEdges[i];
    add(
      [(roofEdges[i] + roofEdges[i + 1]) / 2, 1.2225, -1.786],
      [width - 0.008, 0.33, 0.04],
      i === 1 ? '#5d5437' : '#7b5e3b',
      true,
    );
  }
  for (const x of [-0.34, 0.425]) {
    add([x, 1.1825, -1.745], [0.035, 0.285, 0.14], '#493627', true);
    add([x, 1.04, -1.756], [0.065, 0.048, 0.11], '#57412b', true);
  }
  // Stepped dark mirror bezel with a subdued worn inner lip.
  for (const x of [-0.315, 0.405])
    add([x, 0.79, -1.782], [0.025, 0.23, 0.025], '#393729');
  for (const y of [0.677, 0.903])
    add([0.045, y, -1.782], [0.72, 0.018, 0.025], '#45412f');
  return parts;
}
