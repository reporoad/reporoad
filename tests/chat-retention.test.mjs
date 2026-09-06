import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { PRUNE_CHAT_SQL } from '../lib/chat-retention.ts';
test('retention keeps newest 1000 IDs with tied timestamps and gaps', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE chat_messages (id INTEGER PRIMARY KEY, created_at INTEGER)');
    db.exec(PRUNE_CHAT_SQL);
    const insert = db.prepare('INSERT INTO chat_messages VALUES (?, 1)');
    for (let i = 1; i <= 999; i++) insert.run(i * 2);
    db.exec(PRUNE_CHAT_SQL);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n, 999);
    for (let i = 1000; i <= 1200; i++) insert.run(i * 2);
    db.exec(PRUNE_CHAT_SQL);
    assert.deepEqual({ ...db.prepare('SELECT COUNT(*) AS n, MIN(id) AS oldest, MAX(id) AS newest FROM chat_messages').get() }, { n: 1000, oldest: 402, newest: 2400 });
    insert.run(2401); db.exec(PRUNE_CHAT_SQL);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n, 1000);
  } finally { db.close(); }
});
