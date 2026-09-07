import {
  CONFIG_PATH,
  defaultBuilding,
  parseBuildingConfig,
  repositoryHash,
  type Repository,
} from './repositories.ts';

export const CATEGORIES = {
  top: {
    label: 'Top stars · all time',
    description:
      'The 100 most-starred public, non-fork repositories. No config file needed.',
  },
  trending: {
    label: 'Trending · this week',
    description:
      'GitHub’s weekly Trending list, in its original order. Up to 100; GitHub currently supplies fewer.',
  },
  community: {
    label: 'Community · random 100',
    description:
      'A daily shared sample of up to 100 discovered repositories with a valid building file. Not a complete GitHub-wide census.',
  },
  sponsored: {
    label: 'Sponsored',
    description:
      'Paid placements, separate from organic rankings. No sponsored placements are active yet.',
  },
} as const;
export type Category = keyof typeof CATEGORIES;
export function isCategory(value: string): value is Category {
  return Object.hasOwn(CATEGORIES, value);
}
export type CategoryData = {
  repositories: Repository[];
  refreshedAt: number;
  warning?: string;
  pool?: Repository[];
  discoveryCursor?: number;
};
export function publicRepository(
  value: unknown,
  now: number,
): Repository | null {
  const d = value as Record<string, unknown> | null;
  if (
    !d ||
    typeof d.full_name !== 'string' ||
    !/^[\w.-]+\/[\w.-]+$/.test(d.full_name) ||
    d.private === true ||
    !Number.isSafeInteger(d.stargazers_count) ||
    Number(d.stargazers_count) < 0
  )
    return null;
  return {
    fullName: d.full_name,
    name: d.full_name.split('/')[1],
    description:
      typeof d.description === 'string' ? d.description.slice(0, 240) : '',
    stars: Number(d.stargazers_count),
    language: typeof d.language === 'string' ? d.language.slice(0, 80) : null,
    defaultBranch:
      typeof d.default_branch === 'string' ? d.default_branch : 'HEAD',
    fetchedAt: now,
    building: defaultBuilding(d.full_name),
    configStatus: 'unavailable',
  };
}
export function sharedSample(repos: Repository[], now: number): Repository[] {
  const day = Math.floor(now / 86400000);
  const unique = [
    ...new Map(repos.map((r) => [r.fullName.toLowerCase(), r])).values(),
  ];
  return unique
    .filter((r) => r.configStatus === 'custom')
    .sort(
      (a, b) =>
        repositoryHash(`${day}:${a.fullName}`) -
          repositoryHash(`${day}:${b.fullName}`) ||
        a.fullName.localeCompare(b.fullName),
    )
    .slice(0, 100);
}
const plain = (s: string) =>
  s
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
export function parseWeeklyTrending(html: string, now: number): Repository[] {
  const result: Repository[] = [];
  for (const article of html.matchAll(
    /<article\b[^>]*>([\s\S]*?)<\/article>/g,
  )) {
    const body = article[1];
    const fullName = body.match(
      /<h2\b[\s\S]*?href="\/([\w.-]+\/[\w.-]+)"/,
    )?.[1];
    const stars = body.match(
      /href="\/[^"\s]+\/stargazers"[^>]*>([\s\S]*?)<\/a>/,
    )?.[1];
    const weekly = body.match(/([\d,]+)\s+stars this week/)?.[1];
    if (!fullName || !stars || !weekly) continue;
    const repo = publicRepository(
      {
        full_name: fullName,
        stargazers_count: Number(plain(stars).replace(/,/g, '')),
        description: plain(body.match(/<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1] || ''),
        language:
          plain(
            body.match(
              /itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/,
            )?.[1] || '',
          ) || null,
      },
      now,
    );
    if (repo)
      result.push({ ...repo, weeklyStars: Number(weekly.replace(/,/g, '')) });
  }
  return [
    ...new Map(result.map((r) => [r.fullName.toLowerCase(), r])).values(),
  ].slice(0, 100);
}
export function githubOptions(token?: string): RequestInit {
  return {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Chilldrive-repository-world',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(8000),
  };
}
async function boundedText(response: Response, max: number) {
  const reader = response.body?.getReader();
  if (!reader) throw Error('Empty response');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) throw Error('Response too large');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(joined);
}
export async function checkPublicStyle(
  repo: Repository,
  request: typeof fetch = fetch,
  revision = 'HEAD',
): Promise<Repository> {
  try {
    if (revision !== 'HEAD' && !/^[a-f0-9]{40}$/.test(revision)) throw Error('Invalid config revision');
    // No token or external URL from config is ever sent to this public content host.
    const url = `https://raw.githubusercontent.com/${repo.fullName}/${revision}/${CONFIG_PATH}`;
    const response = await request(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404)
      return {
        ...repo,
        building: defaultBuilding(repo.fullName),
        configStatus: 'default',
        configCheckedAt: Date.now(),
      };
    if (!response.ok)
      return {
        ...repo,
        configStatus: 'unavailable',
        configCheckedAt: Date.now(),
      };
    let parsed = null;
    try {
      parsed = parseBuildingConfig(await boundedText(response, 8192));
    } catch {
      /* Invalid/oversized file. */
    }
    return {
      ...repo,
      building: parsed || repo.building,
      configStatus: parsed ? 'custom' : 'invalid',
      configCheckedAt: Date.now(),
    };
  } catch {
    return {
      ...repo,
      configStatus: 'unavailable',
      configCheckedAt: Date.now(),
    };
  }
}
export async function discoverCategory(
  category: Category,
  previous: CategoryData,
  now: number,
  token?: string,
  request: typeof fetch = fetch,
): Promise<CategoryData> {
  if (category === 'sponsored') return { repositories: [], refreshedAt: now };
  let repositories: Repository[];
  if (category === 'top') {
    const res = await request(
      'https://api.github.com/search/repositories?q=stars:%3E10000+is:public+fork:false&sort=stars&order=desc&per_page=100',
      githubOptions(token),
    );
    if (!res.ok) throw Error(`GitHub search unavailable (${res.status})`);
    const data = (await res.json()) as {
      items?: unknown[];
      incomplete_results?: boolean;
    };
    if (!Array.isArray(data.items) || data.incomplete_results)
      throw Error(
        'GitHub returned an incomplete ranking; keeping the last complete list.',
      );
    repositories = data.items
      .map((v) => publicRepository(v, now))
      .filter((r): r is Repository => !!r);
    if (repositories.length !== 100)
      throw Error('GitHub did not return a complete top 100.');
    repositories.sort(
      (a, b) => b.stars - a.stars || a.fullName.localeCompare(b.fullName),
    );
  } else if (category === 'trending') {
    const res = await request('https://github.com/trending?since=weekly', {
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Chilldrive-repository-world' },
    });
    if (!res.ok) throw Error(`Weekly Trending unavailable (${res.status})`);
    repositories = parseWeeklyTrending(await boundedText(res, 2_000_000), now);
    if (!repositories.length)
      throw Error(
        'GitHub’s Trending layout changed or returned no entries; keeping the last list.',
      );
  } else {
    if (!token)
      throw Error(
        'Community discovery needs a server-side GitHub read token. Committing the file alone is not yet enough to be discovered here.',
      );
    // Rotate through the first 1,000 indexed matches over ten days, accumulating
    // a bounded pool. No claim of uniform sampling across all of GitHub.
    const url =
      'https://api.github.com/search/code?q=filename:.reporoad.yml&per_page=100&page=1';
    const res = await request(url, githubOptions(token));
    if (!res.ok) throw Error(`Community search unavailable (${res.status})`);
    let data = (await res.json()) as {
      total_count?: number;
      items?: { path?: string; repository?: { full_name?: string } }[];
      incomplete_results?: boolean;
    };
    const pages = Math.min(10, Math.ceil((data.total_count || 0) / 100));
    const page = pages ? (Math.floor(now / 86400000) % pages) + 1 : 1;
    if (page > 1) {
      const next = await request(
        url.replace('&page=1', `&page=${page}`),
        githubOptions(token),
      );
      if (!next.ok)
        throw Error(`Community search unavailable (${next.status})`);
      data = (await next.json()) as typeof data;
    }
    if (!Array.isArray(data.items) || data.incomplete_results)
      throw Error(
        'Community search was incomplete; keeping the last verified sample.',
      );
    const names = [
      ...new Set(
        data.items
          .filter((x) => x.path === CONFIG_PATH)
          .map((x) => x.repository?.full_name)
          .filter((n): n is string => !!n && /^[\w.-]+\/[\w.-]+$/.test(n)),
      ),
    ];
    const pool = new Map(
      (previous.pool || previous.repositories).map((r) => [
        r.fullName.toLowerCase(),
        r,
      ]),
    );
    // Bounded work per visit: metadata + style for at most 12 candidates.
    const allNames = [
      ...new Set([...names, ...[...pool.values()].map((r) => r.fullName)]),
    ];
    const cursor =
      (previous.discoveryCursor || 0) % Math.max(1, allNames.length);
    const candidates = [
      ...allNames.slice(cursor),
      ...allNames.slice(0, cursor),
    ].slice(0, 12);
    for (const name of candidates) {
      const metadata = await request(
        `https://api.github.com/repos/${name}`,
        githubOptions(token),
      );
      if (metadata.status === 403 || metadata.status === 429) break;
      if (!metadata.ok) {
        pool.delete(name.toLowerCase());
        continue;
      }
      const repo = publicRepository(await metadata.json(), now);
      if (!repo) {
        pool.delete(name.toLowerCase());
        continue;
      }
      const checked = await checkPublicStyle(repo, request);
      if (checked.configStatus === 'custom')
        pool.set(name.toLowerCase(), checked);
      else pool.delete(name.toLowerCase());
    }
    const valid = [...pool.values()]
      .filter((r) => now - (r.configCheckedAt || 0) < 86400000)
      .slice(-1000);
    return {
      repositories: valid.sort((a, b) => a.fullName.localeCompare(b.fullName)),
      pool: valid,
      refreshedAt: now,
      discoveryCursor: cursor + candidates.length,
    };
  }
  const old = new Map(
    previous.repositories.map((r) => [r.fullName.toLowerCase(), r]),
  );
  repositories = repositories.map((r) => {
    const p = old.get(r.fullName.toLowerCase());
    return p
      ? {
          ...r,
          building:
            p.configStatus === 'default'
              ? defaultBuilding(r.fullName)
              : p.building,
          configStatus: p.configStatus,
          configCheckedAt: p.configCheckedAt,
        }
      : r;
  });
  return { repositories, refreshedAt: now };
}
