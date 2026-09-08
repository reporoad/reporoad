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
    key: day * (72 * (1 - overcast) + 6.3 * overcast),
    // Preserve the sunlit crown / shaded fascia contrast. Cloud cover still
    // wraps diffuse light into the cabin at the previous overcast strength.
    frontFill: day * (0.85 * (1 - overcast) + 2.05 * overcast),
    windowFill: day * (0.65 + overcast * 0.4),
    sunBounce: day * 1.2 * (1 - overcast * 0.7),
  };
}

/** Bounded window-light proxy following the same solar arc as the exterior. */
export function cabinSunlight(daylight: number, sunAngle: number, wet: number) {
  const sin = Math.sin(sunAngle);
  return {
    position: [-Math.cos(sunAngle) * 1.8, 0.9 + Math.max(0, sin) * 1.8, -3.1] as [number, number, number],
    warmth: sceneLighting(daylight, sunAngle, wet).golden * (1 - Math.max(0, Math.min(1, wet))),
  };
}
