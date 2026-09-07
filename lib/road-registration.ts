import { checkPublicStyle, publicRepository } from './repository-categories.ts';
import type { Repository } from './repositories.ts';

// Explicitly requested starter registrations. They must pass the same live checks
// as submissions; an unmerged/missing config never creates a building.
export const INITIAL_REGISTRATIONS = ['reporoad/reporoad', 'impresspress/impresspress',
  'wafer-run/wafer-run', 'gizza-ai/gizza-ai', 'wagmiphotos/wagmiphotos'];
// Owner-approved exception: read only the reviewed PR commit, never an arbitrary
// branch/revision supplied through the public submission endpoint.
const IMPRESSPRESS_REVISION = '023042768f723023262247f592470a4ffc08d323';
export function repositoryName(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 250) return null;
  const name = value.trim().replace(/^https:\/\/github\.com\//i, '').replace(/^github\.com\//i, '').replace(/\/$/, '');
  if (!/^[a-z\d](?:[a-z\d-]{0,38})\/[a-z\d_.-]{1,100}$/i.test(name) || ['.', '..'].includes(name.split('/')[1])) return null;
  return name.toLowerCase();
}
export class RegistrationError extends Error {
  status: number;
  constructor(message: string, status = 422) { super(message); this.status = status; }
}
export async function verifyRepository(name: string, token?: string, request: typeof fetch = fetch): Promise<Repository> {
  const safe = repositoryName(name);
  if (!safe) throw new RegistrationError('Enter a GitHub URL or owner/repo.', 400);
  const response = await request(`https://api.github.com/repos/${safe}`, {
    redirect: 'manual', signal: AbortSignal.timeout(8000),
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'RepoRoad', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (response.status === 404) throw new RegistrationError('Public repository not found.', 404);
  if (!response.ok) throw new RegistrationError('GitHub is unavailable or rate-limited. Try again shortly.', 503);
  const repo = publicRepository(await response.json(), Date.now());
  if (!repo || repositoryName(repo.fullName) !== safe) throw new RegistrationError('Only public repositories can join the road.');
  const curated = safe === 'impresspress/impresspress';
  const checked = await checkPublicStyle(repo, request, curated ? IMPRESSPRESS_REVISION : 'HEAD');
  if (checked.configStatus === 'unavailable') throw new RegistrationError('Unable to read the repository file. Try again shortly.', 503);
  if (checked.configStatus !== 'custom') throw new RegistrationError('Commit a valid .reporoad.yml at the root of the default branch first.');
  return curated ? {...checked, placement: 'featured', configSource: 'curated-pr'} : checked;
}
export const SAVE_REGISTRATION = `INSERT INTO road_registrations(name,payload,checked_at,refresh_after)
  SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM road_registrations)<1000 OR EXISTS(SELECT 1 FROM road_registrations WHERE name=?)
  ON CONFLICT(name) DO UPDATE SET payload=excluded.payload,checked_at=excluded.checked_at,refresh_after=excluded.refresh_after`;
export async function saveRegistration(db: D1Database, repo: Repository, now = Date.now()) {
  const name = repo.fullName.toLowerCase();
  const result = await db.prepare(SAVE_REGISTRATION).bind(name, JSON.stringify(repo), now, now + 3600000, name).run();
  if (!result.meta.changes) throw new RegistrationError('The road directory is currently full.', 503);
}
export async function registeredRoad(db: D1Database, token?: string, request: typeof fetch = fetch, now = Date.now()) {
  // Bounded, idempotent bootstrap outside schema migrations.
  await db.batch(INITIAL_REGISTRATIONS.map(name => db.prepare('INSERT OR IGNORE INTO road_registrations(name,payload,checked_at,refresh_after) VALUES (?,NULL,0,0)').bind(name)));
  const due = await db.prepare('SELECT name FROM road_registrations WHERE refresh_after<=? ORDER BY refresh_after LIMIT 8').bind(now).all<{name: string}>();
  await Promise.all(due.results.map(async ({name}) => {
    const lease = await db.prepare('UPDATE road_registrations SET refresh_after=? WHERE name=? AND refresh_after<=?').bind(now + 3600000, name, now).run();
    if (!lease.meta.changes) return;
    try { await saveRegistration(db, await verifyRepository(name, token, request), now); }
    catch (error) {
      // Remove confirmed opt-outs/invalid files, but retain last good data during
      // transient GitHub outages (up to one day). Keep the identity for retries.
      if (error instanceof RegistrationError && error.status !== 503)
        await db.prepare('UPDATE road_registrations SET payload=NULL,checked_at=? WHERE name=? AND checked_at<?').bind(now, name, now).run();
    }
  }));
  const rows = await db.prepare('SELECT payload FROM road_registrations WHERE payload IS NOT NULL AND checked_at>? ORDER BY name LIMIT 1000').bind(now - 86400000).all<{payload: string}>();
  return rows.results.map(row => JSON.parse(row.payload) as Repository);
}
export function mergeRoad(discovered: Repository[], registered: Repository[]) {
  const direct = new Map(registered.map(r => [r.fullName.toLowerCase(), r]));
  // Reserve directory capacity for explicit registrations before optional search.
  const combined = [...direct.values(), ...new Map(discovered.filter(r => !direct.has(r.fullName.toLowerCase())).map(r => [r.fullName.toLowerCase(), r])).values()];
  return combined.slice(0,1000).sort((a,b) => Number(b.placement === 'featured') - Number(a.placement === 'featured') || a.fullName.localeCompare(b.fullName));
}
