import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const source = (await readFile(new URL('../app/api/chickens/route.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '');
const mocks = `
const validChickenBatch = () => false, CHICKEN_UPSERT = '';
const readSchedule = async () => ({ round: 1000000, stopAt: Date.now() + 300000 });
const database = () => ({ prepare: () => ({ bind: () => ({ all: async () => ({ results: [] }) }) }) });
`;
const { GET } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(mocks + source)).toString('base64')}`);

test('chicken schedule survives absent, throwing and unavailable caches', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  try {
    for (const descriptor of [
      { value: undefined },
      { get() { throw Error('Cache unavailable'); } },
      { value: { default: { match: async () => { throw Error('Cache read failed'); } } } },
      { value: { default: { match: async () => undefined, put: async () => { throw Error('Cache write failed'); } } } },
    ]) {
      Object.defineProperty(globalThis, 'caches', { configurable: true, ...descriptor });
      const response = await GET(new Request('https://example.com/api/chickens'));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.equal((await response.json()).round, 1000000);
    }
  } finally {
    if (original) Object.defineProperty(globalThis, 'caches', original);
    else delete globalThis.caches;
  }
});
