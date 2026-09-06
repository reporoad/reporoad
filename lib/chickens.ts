export const CHICKEN_PERIOD = 300;
export const CROSSING_SECONDS = 20;
export const MAX_RENDERED_CHICKENS = 64;
export const MAX_CHICKENS_PER_SESSION = 6000;
export const CHICKEN_BATCH_MS = 10000;
const epoch = Date.UTC(2026, 0, 1);
// Integral of smoothstep: acceleration and braking join with zero jerk in speed.
const integral = (u: number) => u * u * u - u * u * u * u / 2;
export function chickenCycle(now: number) {
  const seconds = Math.max(0, (now - epoch) / 1000);
  const round = Math.floor(seconds / CHICKEN_PERIOD);
  const phase = seconds % CHICKEN_PERIOD;
  const movingSeconds = phase < 20 ? 0 : phase < 24
    ? 4 * integral((phase - 20) / 4)
    : phase < 296 ? phase - 22
    : 274 + 4 * ((phase - 296) / 4 - integral((phase - 296) / 4));
  const distance = (round * 276 + movingSeconds) * 6.5;
  const stopDistance = (round + (phase < 40 ? 0 : 1)) * 276 * 6.5;
  return { round, phase, distance, signalZ: -10 + distance - stopDistance,
    crossing: phase < CROSSING_SECONDS, nextIn: Math.ceil(300 - phase) };
}
export function validChickenBatch(value: unknown): value is { id: string; round: number; total: number } {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && /^[a-f0-9-]{36}$/i.test(v.id)
    && Number.isSafeInteger(v.round) && Number.isSafeInteger(v.total)
    && Number(v.total) > 0 && Number(v.total) <= MAX_CHICKENS_PER_SESSION;
}
// Cumulative totals make retries and out-of-order delivery idempotent.
export const CHICKEN_UPSERT = `INSERT INTO chicken_clicks (id, round, total)
 SELECT ?, ?, min(?, 200) WHERE EXISTS (SELECT 1 FROM chicken_limits WHERE id = ? AND nonce = ?)
 ON CONFLICT(id, round) DO UPDATE SET total = min(max(chicken_clicks.total, ?), chicken_clicks.total + 200)`;
