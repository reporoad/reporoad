import { database } from './db';
import { ADVANCE_CROSSING, DRIVE_DISTANCE, type CrossingSchedule } from './chickens';
export async function readSchedule(now: number): Promise<CrossingSchedule> {
  const db = database();
  const select = () => db.prepare('SELECT round, stop_at AS stopAt, started_at AS startedAt, depart_at AS departAt, crossing_count AS crossingCount, base_distance AS baseDistance FROM chicken_schedule WHERE id = 1').first<CrossingSchedule>();
  let state = await select();
  if (!state) {
    await db.prepare('INSERT OR IGNORE INTO chicken_schedule (id, round, stop_at, started_at, depart_at, crossing_count, base_distance) VALUES (1, 1000000, ?, ?, ?, 0, 0)').bind(now + 300000, now, now).run();
    state = (await select())!;
  }
  if (now >= state.stopAt) {
    const start = Math.max(state.stopAt, now) + 1500;
    // Freeze the count and advance the round in ONE atomic statement.
    await db.prepare(ADVANCE_CROSSING).bind(state.round, start, start, start, DRIVE_DISTANCE, state.round).run();
    state = (await select())!;
  }
  return state;
}
