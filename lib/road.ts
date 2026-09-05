export const ROAD_LENGTH = 384;
export const SECTION_SPACING = 32;
export const CAMERA_Z = 7;
// Plots are centred 30 m ahead of each section, with a 7 m footprint.
// Recycle only when the entire section (including its plot) is behind the car.
export const RECYCLE_BEHIND_Z = 76;
export function roadSectionZ(index: number, distance: number): number {
  const raw = -index * SECTION_SPACING + distance;
  return (
    RECYCLE_BEHIND_Z -
    ((((RECYCLE_BEHIND_Z - raw) % ROAD_LENGTH) + ROAD_LENGTH) % ROAD_LENGTH)
  );
}
export function roadMarkerZ(index: number, distance: number): number {
  return (
    25 -
    ((((25 + index * 8 - distance) % ROAD_LENGTH) + ROAD_LENGTH) % ROAD_LENGTH)
  );
}
