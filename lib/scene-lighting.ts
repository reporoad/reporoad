/** Shared, deterministic art direction: previews and the live drive use the same curve. */
export function sceneLighting(daylight: number, sunAngle: number, wet: number) {
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const day = clamp(daylight);
  const overcast = clamp(wet);
  const golden = clamp(1 - Math.abs(Math.sin(sunAngle)) / 0.8) * day;
  return {
    golden,
    sunlight: (0.2 + day * 2.8) * (1 - overcast * 0.6),
    fill: 0.45 + day * 0.6 + overcast * 0.12,
    // Keep nearby facades crisp; haze belongs to the valley, not the dashboard.
    fogNear: 105 - overcast * 35,
    fogFar: 290 - overcast * 90,
  };
}

/** Window light: directional in sunshine, diffuse under rain or snow. */
export function cabinLighting(daylight: number, wet: number) {
  const day = Math.max(0, Math.min(1, daylight));
  const overcast = Math.max(0, Math.min(1, wet));
  return {
    key: day * (58 * (1 - overcast) + 6.3 * overcast),
    frontFill: day * (1.65 + overcast * 0.4),
    windowFill: day * (0.65 + overcast * 0.4),
    sunBounce: day * 1.2 * (1 - overcast * 0.7),
  };
}
