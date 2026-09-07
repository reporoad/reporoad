import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBuildingConfig, serializeBuildingConfig, CONFIG_PATH, BUILDING_STYLES } from '../lib/repositories.ts';
test('YAML round-trip preserves every editable setting', () => {
  for (const style of BUILDING_STYLES) {
    const config = { version: 1, style, color: '#abcdef', roof: 'flat', signText: 'Repo: #1 ♥', garden: false, support: { sponsor: true, helpWanted: true } };
    assert.deepEqual(parseBuildingConfig(serializeBuildingConfig(config)), config);
  }
  assert.equal(CONFIG_PATH, '.reporoad.yml');
});
test('YAML accepts comments but rejects unsafe, ambiguous and oversized inputs', () => {
  const base = 'version: 1\nstyle: woodland\ncolor: "#778565"\nroof: gable\n';
  assert.ok(parseBuildingConfig('# A comment\n' + base));
  for (const extra of ['version: 2\n', 'garden: yes\n', 'signText: 42\n', 'script: alert(1)\n', 'support: {sponsor: "true"}\n', 'garden: &x [*x]\n', `signText: ${'a'.repeat(49)}\n`]) assert.equal(parseBuildingConfig(base + extra), null, extra);
  assert.equal(parseBuildingConfig(base + '#'.repeat(8192)), null);
});
