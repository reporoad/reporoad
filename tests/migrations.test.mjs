import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { loadHistory, validateHistory, verifyUpgrades, migrateTestDatabase } from '../scripts/check-migrations.mjs';
const { migrations, published } = await loadHistory();
test('published migration history is intact and every upgrade preserves data', () => {
  validateHistory(migrations, published);
  verifyUpgrades(migrations);
});
test('published edits, removed files and reordered journal entries fail closed', () => {
  for (const change of [
    m => { m[0].sql += '\n-- changed'; },
    m => { m[0].snapshot += ' '; },
    m => { m[0].entry.when++; },
    m => { m.pop(); },
    m => { [m[0], m[1]] = [m[1], m[0]]; },
  ]) {
    const modified = structuredClone(migrations); change(modified);
    assert.throws(() => validateHistory(modified, published));
  }
});
test('failed migration rolls back its partial work and is not marked applied', () => {
  const db = new DatabaseSync(':memory:');
  try {
    migrateTestDatabase(db, migrations);
    const bad = {entry:{tag:'test_bad'}, sql:'CREATE TABLE partial_change(id INTEGER); CREATE TABLE chat_messages(id INTEGER);'};
    assert.throws(() => migrateTestDatabase(db, [...migrations, bad]));
    assert.equal(db.prepare("SELECT name FROM sqlite_schema WHERE name = 'partial_change'").get(), undefined);
    assert.equal(db.prepare("SELECT tag FROM __migration_test_ledger WHERE tag = 'test_bad'").get(), undefined);
    migrateTestDatabase(db, migrations);
  } finally { db.close(); }
});
