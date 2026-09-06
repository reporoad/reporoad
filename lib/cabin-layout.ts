// Scale and position together preserve the foreground seat's apparent size,
// while placing it entirely in front of the wheel instead of through its rim.
export const driverSeatScale = 0.76;
export const driverSeatPosition: [number, number, number] = [
  1.31 * driverSeatScale,
  -1.015 * driverSeatScale,
  -1.1 * driverSeatScale,
];
export const wheelPosition: [number, number, number] = [0.675, -0.505, -1.22];
export const wheelScale: [number, number, number] = [0.85, 0.79, 0.86];
export const wheelRotation: [number, number, number] = [-0.25, 0, -0.015];
