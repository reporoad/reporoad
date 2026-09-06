/** One shared aspect for the physical glass and its reflection camera. */
const width = 0.65;
const height = 0.17;
export const cabinMirror = {
  width,
  height,
  aspect: width / height,
  // Preserve approximately the previous horizontal field of view.
  verticalFov: 40,
  targetWidth: 384,
  targetHeight: Math.round(384 * height / width),
} as const;
