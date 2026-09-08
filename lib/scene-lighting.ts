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
