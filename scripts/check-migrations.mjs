import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const hash = text => createHash('sha256').update(text).digest('hex');
export function validateHistory(migrations, published) {
  assert.ok(migrations.length >= published.entries.length, 'Published migrations were removed');
  const tags = new Set();
  migrations.forEach((migration, index) => {
    const { entry, sql, snapshot } = migration;
    assert.equal(entry.idx, index, 'Migration indices must remain contiguous');
    assert.match(entry.tag, new RegExp(`^${String(index).padStart(4, '0')}_[a-zA-Z0-9_]+$`));
    assert.ok(!tags.has(entry.tag), 'Duplicate migration tag');
    tags.add(entry.tag);
    assert.ok(Number.isSafeInteger(entry.when), 'Invalid migration timestamp');
    if (index) assert.ok(entry.when > migrations[index - 1].entry.when, 'Append migrations in timestamp order');
    assert.ok(sql.trim(), 'Empty migration');
    JSON.parse(snapshot);
    const locked = published.entries[index];
    if (locked) {
      assert.deepEqual(entry, locked.entry, `Published journal entry changed: ${entry.tag}`);
      assert.equal(hash(sql), locked.sqlSha256, `Published SQL changed: ${entry.tag}`);
      assert.equal(hash(snapshot), locked.snapshotSha256, `Published snapshot changed: ${entry.tag}`);
    }
  });
}

// This ledger exists only in disposable, in-memory test databases. Sites remains
// the sole owner of the real production migration ledger and execution.
export function migrateTestDatabase(db, migrations) {
  db.exec('CREATE TABLE IF NOT EXISTS __migration_test_ledger (tag TEXT PRIMARY KEY, hash TEXT NOT NULL)');
  for (const { entry, sql } of migrations) {
    const applied = db.prepare('SELECT hash FROM __migration_test_ledger WHERE tag = ?').get(entry.tag);
    if (applied) {
      assert.equal(applied.hash, hash(sql), `Applied SQL drift: ${entry.tag}`);
      continue;
    }
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO __migration_test_ledger VALUES (?, ?)').run(entry.tag, hash(sql));
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}
const schema = db => db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND name != '__migration_test_ledger' ORDER BY type, name").all();
export function verifyUpgrades(migrations) {
  const fresh = new DatabaseSync(':memory:');
  try {
    migrateTestDatabase(fresh, migrations);
    const expected = schema(fresh);
    for (let prefix = 0; prefix <= migrations.length; prefix++) {
      const db = new DatabaseSync(':memory:');
      try {
        migrateTestDatabase(db, migrations.slice(0, prefix));
        if (prefix) db.prepare('INSERT INTO chat_messages(user_id,name,body,created_at) VALUES (?,?,?,?)').run('migration-test', 'Test', 'Preserve this message', 1);
        migrateTestDatabase(db, migrations);
        migrateTestDatabase(db, migrations);
        assert.deepEqual(schema(db), expected, `Upgrade from migration prefix ${prefix} differs from fresh install`);
        if (prefix) assert.equal(db.prepare("SELECT body FROM chat_messages WHERE user_id = 'migration-test'").get()?.body, 'Preserve this message', 'Upgrade lost existing chat data');
        assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
        assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
      } finally { db.close(); }
    }
  } finally { fresh.close(); }
}
export async function loadHistory(root = new URL('../drizzle/', import.meta.url)) {
  const journal = JSON.parse(await readFile(new URL('meta/_journal.json', root), 'utf8'));
  const published = JSON.parse(await readFile(new URL('published-migrations.json', root), 'utf8'));
  const migrations = await Promise.all(journal.entries.map(async entry => ({ entry,
    sql: await readFile(new URL(`${entry.tag}.sql`, root), 'utf8'),
    snapshot: await readFile(new URL(`meta/${String(entry.idx).padStart(4, '0')}_snapshot.json`, root), 'utf8'),
  })));
  assert.deepEqual((await readdir(root)).filter(name => name.endsWith('.sql')).sort(), migrations.map(m => `${m.entry.tag}.sql`).sort(), 'SQL files and journal disagree');
  return { migrations, published };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { migrations, published } = await loadHistory();
  validateHistory(migrations, published);
  verifyUpgrades(migrations);
  console.log(`Migration checks passed: ${migrations.length} migrations; fresh install, every upgrade prefix, retry and data preservation.`);
}
