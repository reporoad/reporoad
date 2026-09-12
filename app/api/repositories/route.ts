import { env } from 'cloudflare:workers';
import { database } from '@/lib/db';
import { SAMPLE_ROAD } from '@/lib/road-seed';
import { registeredRoad, mergeRoad } from '@/lib/road-registration';
import { applyWebsiteSettings } from '@/lib/building-settings';
import { discoverCategory, type CategoryData } from '@/lib/repository-categories';
export const dynamic = 'force-dynamic';
const CHECK_MS = 5 * 60 * 1000;
const headers = { 'Cache-Control': 'no-store' };
export async function GET() {
  const token = (env as unknown as { GITHUB_READ_TOKEN?: string }).GITHUB_READ_TOKEN;
  const empty: CategoryData = { repositories: [], refreshedAt: 0 };
  try {
    const db = database(), now = Date.now(), id = 'road-yaml-v1';
    const registered = await registeredRoad(db, token);
    if (import.meta.env.DEV) return Response.json({
      repositories: await applyWebsiteSettings(db,mergeRoad(SAMPLE_ROAD, registered)), source: 'local-samples',
      warning: `${registered.length} verified registrations · local sample buildings also shown.`,
    }, { headers });
    await db.prepare('INSERT OR IGNORE INTO repository_world_cache (id,payload,refreshed_at,refresh_after) VALUES (?,?,?,?)')
      .bind(id, JSON.stringify(empty), 0, 0).run();
    const row = await db.prepare('SELECT payload FROM repository_world_cache WHERE id=?')
      .bind(id).first<{ payload: string }>();
    let data: CategoryData = row ? JSON.parse(row.payload) : empty;
    const lease = await db.prepare('UPDATE repository_world_cache SET refresh_after=? WHERE id=? AND refresh_after<=?')
      .bind(now + CHECK_MS, id, now).run();
    if (lease.meta.changes) {
      try { data = await discoverCategory('community', data, now, token); }
      catch (error) { data.warning = error instanceof Error ? error.message : 'Discovery temporarily unavailable.'; }
      await db.prepare('UPDATE repository_world_cache SET payload=?,refreshed_at=? WHERE id=?')
        .bind(JSON.stringify(data), now, id).run();
    }
    return Response.json({
      repositories: await applyWebsiteSettings(db,mergeRoad(data.repositories.filter(r => r.configStatus === 'custom' && now - (r.configCheckedAt || 0) < 86400000), registered)),
      source: 'github-cache', warning: data.warning ? 'Automatic GitHub discovery is unavailable. Direct repository submissions still work.' : undefined, refreshedAt: data.refreshedAt,
    }, { headers });
  } catch {
    return Response.json({ ...empty, source: 'unavailable',
      warning: 'The road directory is unavailable. Please try again shortly.' }, { headers, status: 503 });
  }
}
