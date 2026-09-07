import { parseDocument, stringify } from 'yaml';
export const CONFIG_PATH = '.reporoad.yml';
export const BUILDING_STYLES = [
  'woodland',
  'brick',
  'stone',
  'greenhouse',
  'townhouse',
  'cafe',
] as const;
export type BuildingStyle = {
  version: 1;
  style: (typeof BUILDING_STYLES)[number];
  color: string;
  roof: 'gable' | 'flat';
  signText?: string;
  garden?: boolean;
  support?: { sponsor?: boolean; helpWanted?: boolean };
};
export type Repository = {
  fullName: string;
  name: string;
  description: string;
  stars: number;
  language: string | null;
  defaultBranch: string;
  fetchedAt: number;
  building: BuildingStyle;
  configStatus: 'default' | 'custom' | 'invalid' | 'unavailable';
  configCheckedAt?: number;
  weeklyStars?: number;
};
export const STARS_PER_FLOOR = 10_000;
/** Short labels never expose the owner prefix; long names wrap without distortion. */
export function repositorySignLines(name: string): string[] {
  if (name.length <= 20) return [name];
  const middle = name.length / 2;
  const breaks = [...name.matchAll(/[-_. ]/g)]
    .map((m) => m.index + 1)
    .filter((i) => i >= name.length * 0.3 && i <= name.length * 0.7);
  const split =
    breaks.sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle))[0] ??
    Math.ceil(middle);
  return [name.slice(0, split), name.slice(split)];
}
export function repositoryFloors(stars: number): number {
  return Number.isFinite(stars) && stars >= 0
    ? Math.max(1, Math.floor(stars / STARS_PER_FLOOR))
    : 1;
}
export function repositoryHash(name: string): number {
  let hash = 2166136261;
  for (const char of name.toLowerCase())
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}
export function defaultBuilding(identity: string | number): BuildingStyle {
  const index = repositoryHash(String(identity));
  return {
    version: 1,
    style: BUILDING_STYLES[index % BUILDING_STYLES.length],
    color: ['#8c704a', '#96624c', '#899080', '#778565', '#b29165', '#7d9193'][
      Math.floor(index / 5) % 6
    ],
    roof: Math.floor(index / 30) % 2 ? 'flat' : 'gable',
  };
}
export function parseBuildingConfig(raw: string): BuildingStyle | null {
  if (new TextEncoder().encode(raw).length > 8192) return null;
  try {
    const doc = parseDocument(raw, { uniqueKeys: true, schema: 'core' });
    if (doc.errors.length) return null;
    const value = doc.toJS({ maxAliasCount: 0 });
    if (!value || Array.isArray(value) || typeof value !== 'object')
      return null;
    if (
      Object.keys(value).some(
        (k) => !['version', 'style', 'color', 'roof', 'support', 'signText', 'garden'].includes(k),
      )
    )
      return null;
    if (
      value.version !== 1 ||
      !BUILDING_STYLES.includes(value.style) ||
      typeof value.color !== 'string' ||
      !/^#[0-9a-f]{6}$/i.test(value.color) ||
      !['gable', 'flat'].includes(value.roof)
    )
      return null;
    if (value.signText !== undefined && (typeof value.signText !== 'string' || value.signText.length > 48 || /[\x00-\x1f\x7f]/.test(value.signText))) return null;
    if (value.garden !== undefined && typeof value.garden !== 'boolean') return null;
    if (value.support !== undefined && (
      !value.support || typeof value.support !== 'object' || Array.isArray(value.support) ||
      Object.entries(value.support).some(([key, flag]) => !['sponsor', 'helpWanted'].includes(key) || typeof flag !== 'boolean')
    )) return null;
    return {
      version: 1,
      style: value.style,
      color: value.color,
      roof: value.roof,
      ...(value.signText === undefined ? {} : { signText: value.signText.trim() }),
      ...(value.garden === undefined ? {} : { garden: value.garden }),
      ...(value.support === undefined ? {} : { support: { sponsor: value.support.sponsor === true, helpWanted: value.support.helpWanted === true } }),
    };
  } catch {
    return null;
  }
}
export function serializeBuildingConfig(building: BuildingStyle): string {
  return '# RepoRoad · commit this file at the root of your public repository\n' + stringify(building);
}
export const EXAMPLE_CONFIG = serializeBuildingConfig({ version: 1, style: 'woodland', color: '#8c704a', roof: 'gable', garden: true, support: { sponsor: false, helpWanted: false } });

export function supportLinks(fullName: string) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(fullName)) return null;
  const [owner, repo] = fullName.split('/').map(encodeURIComponent);
  return { sponsor: `https://github.com/sponsors/${owner}`,
    helpWanted: `https://github.com/${owner}/${repo}/issues?q=${encodeURIComponent('is:issue is:open label:"help wanted"')}` };
}

/** Only fixed GitHub API URLs are fetched; configuration never supplies URLs. */
export async function fetchRepository(
  previous: Repository,
  request: typeof fetch = fetch,
): Promise<Repository> {
  const base = `https://api.github.com/repos/${previous.fullName.split('/').map(encodeURIComponent).join('/')}`;
  const options = () => ({
    headers: {
      'User-Agent': 'Chilldrive-repository-world',
      Accept: 'application/vnd.github+json',
    },
    signal: AbortSignal.timeout(8000),
    // Workers supports manual/follow, not the browser's "error" mode.
    // Non-2xx responses (including redirects) are rejected below.
    redirect: 'manual' as const,
  });
  const response = await request(base, options());
  if (!response.ok)
    throw new Error(`GitHub metadata unavailable (${response.status})`);
  const data = (await response.json()) as {
    full_name?: string;
    name?: unknown;
    stargazers_count: number;
    default_branch: string;
    private?: boolean;
    description?: unknown;
    language?: unknown;
  };
  if (
    data.full_name?.toLowerCase() !== previous.fullName.toLowerCase() ||
    !Number.isSafeInteger(data.stargazers_count) ||
    data.stargazers_count < 0 ||
    typeof data.default_branch !== 'string' ||
    data.private === true
  )
    throw new Error('Invalid public repository metadata');
  let building = previous.building;
  let configStatus: Repository['configStatus'] = 'unavailable';
  try {
    const configResponse = await request(
      `${base}/contents/${CONFIG_PATH}`,
      options(),
    );
    if (configResponse.status === 404) {
      // Removing a previously customised file restores the default style.
      building = defaultBuilding(previous.fullName);
      configStatus = 'default';
    } else if (configResponse.ok) {
      const file = (await configResponse.json()) as {
        type?: string;
        encoding?: string;
        size: number;
        content?: unknown;
      };
      if (
        file.type !== 'file' ||
        file.encoding !== 'base64' ||
        file.size > 8192 ||
        typeof file.content !== 'string' ||
        file.content.length > 12000
      ) {
        configStatus = 'invalid';
      } else {
        const decoded = new TextDecoder().decode(
          Uint8Array.from(atob(file.content.replace(/\s/g, '')), (c) =>
            c.charCodeAt(0),
          ),
        );
        const parsed = parseBuildingConfig(decoded);
        configStatus = parsed ? 'custom' : 'invalid';
        if (parsed) building = parsed;
      }
    }
  } catch {
    /* Keep the last known style, and disclose the failed style check. */
  }
  return {
    ...previous,
    name: String(data.name).slice(0, 100),
    description: String(data.description || '').slice(0, 240),
    stars: data.stargazers_count,
    language:
      typeof data.language === 'string' ? data.language.slice(0, 80) : null,
    defaultBranch: data.default_branch,
    fetchedAt: Date.now(),
    building,
    configStatus,
  };
}
