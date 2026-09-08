export type RenderProbe = { submittedFrames: number; lastSubmittedAt: number | null; maxGapMs: number };
export function recordSceneSubmission(probe: RenderProbe, now: number) {
  if (probe.lastSubmittedAt !== null) probe.maxGapMs = Math.max(probe.maxGapMs, now - probe.lastSubmittedAt);
  probe.lastSubmittedAt = now;
  probe.submittedFrames++;
}

declare global {
  interface Window { __reporoadRenderProbe?: RenderProbe }
}
