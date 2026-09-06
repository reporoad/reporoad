export const CHICKEN_PERIOD = 300;
export const CHICKEN_BATCH_MS = 10000;
export const ADVANCE_CROSSING = `WITH flock AS (SELECT COALESCE(SUM(total), 0) AS n FROM chicken_clicks WHERE round = ?)
 UPDATE chicken_schedule SET round = round + 1, started_at = ?,
 depart_at = ? + (SELECT CASE WHEN n > 0 THEN 10000 + (n - 1) * 125 ELSE 0 END FROM flock),
 stop_at = ? + 300000 + (SELECT CASE WHEN n > 0 THEN 10000 + (n - 1) * 125 ELSE 0 END FROM flock),
 crossing_count = (SELECT n FROM flock), base_distance = base_distance + ?
 WHERE id = 1 AND round = ?`;
export const CHICKEN_INTERVAL = .125;
export const CHICKEN_TRAVEL_SECONDS = 10;
export const DRIVE_DISTANCE = 296 * 6.5;
export type CrossingSchedule = { round: number; stopAt: number; startedAt: number; departAt: number; crossingCount: number; baseDistance: number };
const integral = (u: number) => u ** 3 - u ** 4 / 2;
export function crossingDuration(count: number) {
  return count > 0 ? CHICKEN_TRAVEL_SECONDS + (count - 1) * CHICKEN_INTERVAL : 0;
}
export function visibleChickens(count: number, seconds: number) {
  if (count <= 0 || seconds < 0) return { first: 0, end: 0, remaining: Math.max(0, count) };
  const first = Math.min(count, Math.max(0, Math.floor((seconds - CHICKEN_TRAVEL_SECONDS) / CHICKEN_INTERVAL) + 1));
  const end = Math.min(count, Math.floor(seconds / CHICKEN_INTERVAL) + 1);
  return { first, end, remaining: count - first };
}
// One persisted event owns its count AND timing; stale data cannot start a new flock.
export function chickenCycle(now: number, schedule?: CrossingSchedule | null) {
  if (!schedule) return { round: -1, phase: 0, distance: 0, signalZ: -200, crossing: false, nextIn: 300, remaining: 0, waiting: true };
  const t = Math.min(300, Math.max(0, (now - schedule.departAt) / 1000));
  const movement = t < 4 ? 4 * integral(t / 4) : t < 296 ? t - 2 : 294 + 4 * ((t - 296) / 4 - integral((t - 296) / 4));
  const distance = schedule.baseDistance + movement * 6.5;
  const crossing = now >= schedule.startedAt && now < schedule.departAt && schedule.crossingCount > 0;
  const phase = (now - schedule.startedAt) / 1000;
  const oldSignal = now < schedule.departAt + 16000;
  return { round: schedule.round, phase, distance, signalZ: -10 + distance - schedule.baseDistance - (oldSignal ? 0 : DRIVE_DISTANCE),
    crossing, nextIn: now < schedule.departAt ? 300 : Math.max(0, Math.ceil((schedule.stopAt - now) / 1000)),
    remaining: crossing ? visibleChickens(schedule.crossingCount, phase).remaining : 0, waiting: now >= schedule.stopAt };
}
export function validChickenBatch(value: unknown): value is { id: string; round: number; total: number } {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && /^[a-f0-9-]{36}$/i.test(v.id)
    && Number.isSafeInteger(v.round) && Number.isSafeInteger(v.total)
    && Number(v.round) >= 0 && Number(v.total) > 0;
}
// Cumulative totals make retries and out-of-order delivery idempotent.
export const CHICKEN_UPSERT = `INSERT INTO chicken_clicks (id, round, total)
 SELECT ?, ?, min(?, 200) WHERE EXISTS (SELECT 1 FROM chicken_limits WHERE id = ? AND nonce = ?)
 AND EXISTS (SELECT 1 FROM chicken_schedule WHERE id = 1 AND round = ? AND stop_at > ?)
 ON CONFLICT(id, round) DO UPDATE SET total = min(max(chicken_clicks.total, ?), chicken_clicks.total + 200)`;
