import test from 'node:test';
import assert from 'node:assert/strict';
import {
  repositoryFloors,
  parseBuildingConfig,
  fetchRepository,
  defaultBuilding,
  repositorySignLines,
} from '../lib/repositories.ts';
test('sign names stay intact and wrap long labels instead of squeezing the letters', () => {
  assert.deepEqual(repositorySignLines('three.js'), ['three.js']);
  const name = 'system-prompts-and-models-of-ai-tools';
  const lines = repositorySignLines(name);
  assert.equal(lines.length, 2);
  assert.equal(lines.join(''), name);
  assert.ok(lines.every((line) => line.length <= 24));
});
test('floor thresholds use complete 10,000-star groups, with a minimum of one', () => {
  for (const [stars, floors] of [
    [0, 1],
    [9999, 1],
    [10000, 1],
    [19999, 1],
    [20000, 2],
    [249082, 24],
  ])
    assert.equal(repositoryFloors(stars), floors);
});
test('configuration accepts only safe, bounded style fields', () => {
  const valid = { version: 1, style: 'brick', color: '#aabbcc', roof: 'flat' };
  assert.deepEqual(parseBuildingConfig(JSON.stringify(valid)), valid);
  for (const v of [
    { ...valid, stars: 900000 },
    { ...valid, name: 'Impersonation' },
    { ...valid, script: 'alert(1)' },
    { ...valid, color: 'url(https://example.com)' },
    { ...valid, style: 'unknown' },
    { ...valid, version: 2 },
  ])
    assert.equal(parseBuildingConfig(JSON.stringify(v)), null);
  assert.equal(parseBuildingConfig('x'.repeat(9000)), null);
  assert.equal(parseBuildingConfig('{bad json'), null);
});
const repo = {
  fullName: 'example/repo',
  name: 'repo',
  description: '',
  stars: 1,
  language: null,
  defaultBranch: 'main',
  fetchedAt: 1,
  building: defaultBuilding(0),
  configStatus: 'default',
};
test('reads configuration from the repository default branch and keeps identity authoritative', async () => {
  const calls = [];
  const style = { version: 1, style: 'stone', color: '#aabbcc', roof: 'flat' };
  const request = async (url) => {
    calls.push(url);
    return Response.json(
      calls.length === 1
        ? {
            full_name: 'example/repo',
            name: 'repo',
            stargazers_count: 23456,
            default_branch: 'trunk',
            private: false,
          }
        : {
            type: 'file',
            encoding: 'base64',
            size: 100,
            content: btoa(JSON.stringify(style)),
          },
    );
  };
  const result = await fetchRepository(repo, request);
  assert.equal(result.stars, 23456);
  assert.equal(result.configStatus, 'custom');
  assert.deepEqual(result.building, style);
  assert.equal(
    calls[1],
    'https://api.github.com/repos/example/repo/contents/.reporoad.yml',
  );
});
test('missing file restores default; invalid file preserves last known style', async () => {
  for (const status of [404, 200]) {
    let calls = 0;
    const result = await fetchRepository(
      { ...repo, configStatus: 'custom' },
      async () =>
        ++calls === 1
          ? Response.json({
              full_name: 'example/repo',
              name: 'repo',
              stargazers_count: 10,
              default_branch: 'main',
            })
          : status === 404
            ? new Response('', { status: 404 })
            : Response.json({ type: 'symlink', size: 3 }),
    );
    assert.equal(result.configStatus, status === 404 ? 'default' : 'invalid');
  }
});
test('rate-limit errors do not fabricate new metadata', async () => {
  await assert.rejects(
    fetchRepository(repo, async () => new Response('', { status: 403 })),
    /unavailable/,
  );
});
