import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const binary = existsSync('.tools/betterleaks/betterleaks') ? '.tools/betterleaks/betterleaks' : 'betterleaks';
const staged = process.argv.includes('--staged');
// Ignore rules do not stop force-add or previously tracked secret files.
const files = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
if (files.status !== 0) process.exit(files.status || 1);
const forbidden = files.stdout.split('\0').filter(path => {
  if (/(^|\/)(?:\.env|\.dev\.vars)\.example$/.test(path)) return false;
  return /(^|\/)(?:\.env[^/]*|\.dev\.vars[^/]*|reporoad-rtmps-url[^/]*|rtmps-url[^/]*|\.secrets|secrets)(\/|$)|\.(?:pem|key|p12|pfx)$/.test(path);
});
if (forbidden.length) {
  console.error('Refusing to publish credential-like files (contents not displayed):\n' + forbidden.join('\n'));
  process.exit(1);
}
const result = spawnSync(binary, ['git', '.', '--redact', '--no-banner', '--no-color', '--ignore-gitleaks-allow',
  ...(staged ? ['--pre-commit', '--staged'] : ['--log-opts=--all'])], { stdio: 'inherit' });
if (result.error) console.error('Install BetterLeaks first: bash scripts/security/install-betterleaks.sh');
process.exit(result.status ?? 1);
