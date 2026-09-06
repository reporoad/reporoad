import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultBuilding, BUILDING_STYLES } from '../lib/repositories.ts';
import {
  publicRepository,
  sharedSample,
  parseWeeklyTrending,
  discoverCategory,
  checkPublicStyle,
} from '../lib/repository-categories.ts';
import { roadSectionZ } from '../lib/road.ts';
const repo = (i) =>
  publicRepository(
    { full_name: `owner/repo-${i}`, stargazers_count: 10000 + i },
    1,
  );

test('identity-based defaults are stable, case-insensitive and varied', () => {
  assert.deepEqual(
    defaultBuilding('Owner/Repo'),
    defaultBuilding('owner/repo'),
  );
  const styles = new Set(
    Array.from(
      { length: 100 },
      (_, i) => defaultBuilding(`owner/repo${i}`).style,
    ),
  );
  assert.equal(styles.size, BUILDING_STYLES.length);
  assert.notDeepEqual(defaultBuilding('aa/abc'), defaultBuilding('bb/xyz'));
});
test('daily community samples are unique, bounded, shared, and only valid files', () => {
  const pool = Array.from({ length: 180 }, (_, i) => ({
    ...repo(i),
    configStatus: i < 160 ? 'custom' : 'default',
  }));
  const a = sharedSample([...pool, pool[0]], 1788600000000);
  assert.equal(a.length, 100);
  assert.equal(new Set(a.map((r) => r.fullName)).size, 100);
  assert.deepEqual(a, sharedSample([...pool].reverse(), 1788600000000));
  assert.ok(a.every((r) => r.configStatus === 'custom'));
  assert.notDeepEqual(a, sharedSample(pool, 1788600000000 + 86400000));
});
test('weekly parser preserves actual order and weekly gains, never pads to 100', () => {
  const html =
    '<article><h2><a href="/owner/repo">repo</a></h2><p>A &amp; B</p><a href="/owner/repo/stargazers"><svg></svg>12,345</a><span>1,234 stars this week</span></article>';
  const [r] = parseWeeklyTrending(html, 123);
  assert.equal(r.stars, 12345);
  assert.equal(r.weeklyStars, 1234);
  assert.equal(r.description, 'A & B');
  assert.equal(parseWeeklyTrending(html + html, 123).length, 1);
  assert.deepEqual(parseWeeklyTrending('<html>Layout changed</html>', 123), []);
});
test('top 100 accepts only a complete real ranking and rejects incomplete search', async () => {
  const items = Array.from({ length: 100 }, (_, i) => ({
    full_name: `owner/repo${i}`,
    stargazers_count: 200000 - i,
  }));
  const r = await discoverCategory(
    'top',
    { repositories: [], refreshedAt: 0 },
    123,
    undefined,
    async () => Response.json({ items, incomplete_results: false }),
  );
  assert.equal(r.repositories.length, 100);
  assert.equal(r.repositories[0].stars, 200000);
  for (const data of [
    { items, incomplete_results: true },
    { items: items.slice(0, 99) },
  ])
    await assert.rejects(
      discoverCategory('top', r, 124, undefined, async () =>
        Response.json(data),
      ),
    );
});
test('sponsored does not fabricate payments; community requires server authentication', async () => {
  assert.equal(
    (
      await discoverCategory(
        'sponsored',
        { repositories: [], refreshedAt: 0 },
        1,
      )
    ).repositories.length,
    0,
  );
  await assert.rejects(
    discoverCategory('community', { repositories: [], refreshedAt: 0 }, 1),
    /token/,
  );
});
test('public style checks follow default HEAD, never send a credential, and restore defaults', async () => {
  const source = {
    ...repo(1),
    configStatus: 'custom',
    building: {
      version: 1,
      style: 'townhouse',
      color: '#aabbcc',
      roof: 'flat',
    },
  };
  const valid = await checkPublicStyle(source, async (url, options) => {
    assert.equal(
      url,
      'https://raw.githubusercontent.com/owner/repo-1/HEAD/.github/chilldrive.json',
    );
    assert.equal(options.headers, undefined);
    assert.equal(options.redirect, 'manual');
    return Response.json(source.building);
  });
  assert.equal(valid.configStatus, 'custom');
  const missing = await checkPublicStyle(
    source,
    async () => new Response('', { status: 404 }),
  );
  assert.deepEqual(missing.building, defaultBuilding(source.fullName));
  const oversized = await checkPublicStyle(
    source,
    async () => new Response('x'.repeat(9000)),
  );
  assert.equal(oversized.configStatus, 'invalid');
  assert.deepEqual(oversized.building, source.building);
});
test('100-repository street reaches the last pair without resetting at the old 24-repo loop', () => {
  const length = 50 * 32;
  assert.equal(roadSectionZ(49, 49 * 32 + 22, length) - 30, -8);
  const a = roadSectionZ(20, 383.99, length),
    b = roadSectionZ(20, 384.01, length);
  assert.ok(Math.abs(b - a - 0.02) < 1e-8);
  assert.ok(roadSectionZ(0, 75.99, length) > 75);
  assert.ok(roadSectionZ(0, 76.01, length) < -1500);
});
test('community checks real metadata and file; cursor advances past invalid candidates', async () => {
  const items = Array.from({ length: 24 }, (_, i) => ({
    path: '.github/chilldrive.json',
    repository: { full_name: `owner/repo${i}` },
  }));
  const metadataNames = [];
  const request = async (url) => {
    if (url.includes('/search/code'))
      return Response.json({
        items,
        total_count: 24,
        incomplete_results: false,
      });
    if (url.includes('raw.githubusercontent'))
      return new Response('', { status: 404 });
    const full_name = url.split('/repos/')[1];
    metadataNames.push(full_name);
    return Response.json({ full_name, stargazers_count: 3 });
  };
  const first = await discoverCategory(
    'community',
    { repositories: [], refreshedAt: 0 },
    1,
    'test-token',
    request,
  );
  const second = await discoverCategory(
    'community',
    first,
    2,
    'test-token',
    request,
  );
  assert.equal(metadataNames.length, 24);
  assert.equal(new Set(metadataNames).size, 24);
  assert.equal(second.repositories.length, 0);
});
