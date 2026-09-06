// Run in the same transaction as each insert: keep the newest 1,000 IDs,
// including when timestamps tie. SQLite reuses the freed pages for new messages.
export const PRUNE_CHAT_SQL = `DELETE FROM chat_messages WHERE id < (
  SELECT id FROM chat_messages ORDER BY id DESC LIMIT 1 OFFSET 999
)`;
