import { env } from 'cloudflare:workers';
import { database } from '@/lib/db';
import { CATEGORY_SEED } from '@/lib/category-seed';
import {
  checkPublicStyle,
  discoverCategory,
  isCategory,
  sharedSample,
  type CategoryData,
} from '@/lib/repository-categories';
export const dynamic = 'force-dynamic';
const REFRESH_MS = 6 * 60 * 60 * 1000;
const CHECK_MS = 5 * 60 * 1000;
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  const category = new URL(request.url).searchParams.get('category') || 'top';
  if (!isCategory(category))
    return Response.json(
      { error: 'Unknown repository category' },
      { status: 400, headers },
    );
  const seed = CATEGORY_SEED[category];
  const token = (env as unknown as { GITHUB_READ_TOKEN?: string })
    .GITHUB_READ_TOKEN;
  try {
    const db = database(),
      now = Date.now(),
      id = `category-v1:${category}`;
    await db
      .prepare(
        'INSERT OR IGNORE INTO repository_world_cache (id,payload,refreshed_at,refresh_after) VALUES (?,?,?,?)',
      )
      .bind(id, JSON.stringify(seed), 0, 0)
      .run();
    const row = await db
      .prepare(
        'SELECT payload,refreshed_at AS refreshedAt,refresh_after AS refreshAfter FROM repository_world_cache WHERE id=?',
      )
      .bind(id)
      .first<{ payload: string; refreshedAt: number; refreshAfter: number }>();
    if (!row) throw Error('Cache unavailable');
    let data: CategoryData = JSON.parse(row.payload);
    const lease = await db
      .prepare(
        'UPDATE repository_world_cache SET refresh_after=? WHERE id=? AND refresh_after<=?',
      )
      .bind(now + CHECK_MS, id, now)
      .run();
    if (lease.meta.changes) {
      try {
        if (
          category === 'community' ||
          !row.refreshedAt ||
          now - data.refreshedAt >= REFRESH_MS
        )
          data = await discoverCategory(category, data, now, token);
        if (category === 'top' || category === 'trending') {
          const checks = [...data.repositories]
            .sort((a, b) => (a.configCheckedAt || 0) - (b.configCheckedAt || 0))
            .filter((r) => now - (r.configCheckedAt || 0) >= REFRESH_MS)
            .slice(0, 20);
          const updated = new Map();
          for (let i = 0; i < checks.length; i += 4) {
            const batch = await Promise.all(
              checks.slice(i, i + 4).map((r) => checkPublicStyle(r)),
            );
            for (const r of batch) updated.set(r.fullName, r);
          }
          data.repositories = data.repositories.map(
            (r) => updated.get(r.fullName) || r,
          );
        }
      } catch (error) {
        data.warning =
          error instanceof Error
            ? error.message
            : 'Repository discovery unavailable; retaining the last list.';
      }
      await db
        .prepare(
          'UPDATE repository_world_cache SET payload=?,refreshed_at=? WHERE id=?',
        )
        .bind(JSON.stringify(data), now, id)
        .run();
    }
    const { pool: _pool, discoveryCursor: _cursor, ...publicData } = data;
    return Response.json(
      {
        ...publicData,
        repositories:
          category === 'community'
            ? sharedSample(
                (data.pool || data.repositories).filter(
                  (r) => now - (r.configCheckedAt || 0) < 86400000,
                ),
                now,
              )
            : data.repositories,
        category,
        source: 'github-cache',
        nextRefreshAt: lease.meta.changes ? now + CHECK_MS : row.refreshAfter,
      },
      { headers },
    );
  } catch {
    return Response.json(
      {
        ...seed,
        category,
        source: 'verified-snapshot',
        warning:
          'Live discovery is unavailable. Showing the saved GitHub snapshot where available.',
      },
      { headers },
    );
  }
}
