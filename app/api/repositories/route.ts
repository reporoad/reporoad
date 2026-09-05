import { database } from '@/lib/db';
import { REPOSITORY_SEED } from '@/lib/repository-seed';
import { fetchRepository, type Repository } from '@/lib/repositories';
export const dynamic = 'force-dynamic';
const REFRESH_MS = 6 * 60 * 60 * 1000;
const headers = { 'Cache-Control': 'no-store' };
export async function GET() {
  try {
    const db = database(),
      now = Date.now();
    await db
      .prepare(
        'INSERT OR IGNORE INTO repository_world_cache (id,payload,refreshed_at,refresh_after) VALUES (?,?,?,?)',
      )
      .bind('github-v1', JSON.stringify(REPOSITORY_SEED), 0, 0)
      .run();
    const row = await db
      .prepare(
        'SELECT payload,refreshed_at AS refreshedAt,refresh_after AS refreshAfter FROM repository_world_cache WHERE id=?',
      )
      .bind('github-v1')
      .first<{ payload: string; refreshedAt: number; refreshAfter: number }>();
    if (!row) throw Error('Cache unavailable');
    let repositories: Repository[] = JSON.parse(row.payload);
    let refreshedAt = row.refreshedAt;
    // Atomic lease prevents many viewers from all consuming the GitHub quota.
    const lease = await db
      .prepare(
        'UPDATE repository_world_cache SET refresh_after=? WHERE id=? AND refresh_after<=?',
      )
      .bind(now + REFRESH_MS, 'github-v1', now)
      .run();
    if (lease.meta.changes) {
      const next: Repository[] = [];
      for (let i = 0; i < repositories.length; i += 4) {
        next.push(
          ...(await Promise.all(
            repositories.slice(i, i + 4).map((repo) =>
              fetchRepository(repo).catch((error) => {
                console.warn(
                  'Repository sync failed',
                  repo.fullName,
                  error instanceof Error
                    ? error.message
                    : 'Unknown fetch error',
                );
                return repo;
              }),
            ),
          )),
        );
        if (
          next
            .slice(i)
            .every(
              (repo, offset) =>
                repo.fetchedAt === repositories[i + offset].fetchedAt,
            )
        ) {
          // Stop a failed/rate-limited batch instead of hammering GitHub.
          next.push(...repositories.slice(i + 4));
          break;
        }
      }
      const changed = next.some(
        (repo, i) => repo.fetchedAt !== repositories[i].fetchedAt,
      );
      repositories = next;
      if (changed) refreshedAt = now;
      await db
        .prepare(
          'UPDATE repository_world_cache SET payload=?,refreshed_at=? WHERE id=?',
        )
        .bind(JSON.stringify(repositories), refreshedAt, 'github-v1')
        .run();
    }
    return Response.json(
      {
        repositories,
        refreshedAt,
        nextRefreshAt: lease.meta.changes ? now + REFRESH_MS : row.refreshAfter,
        source: refreshedAt ? 'github-cache' : 'verified-snapshot',
      },
      { headers },
    );
  } catch {
    return Response.json(
      {
        repositories: REPOSITORY_SEED,
        refreshedAt: 0,
        source: 'verified-snapshot',
        warning:
          'Live repository sync is unavailable. Showing the verified 5 September 2026 snapshot.',
      },
      { headers },
    );
  }
}
