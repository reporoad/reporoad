# Production migration safety

Sites owns production D1 provisioning and migration execution. Never run schema
creation in application startup or introduce a second production migration runner.

## Before publishing

1. Make schema changes in `db/schema.ts`, then generate a new Drizzle migration.
2. Never edit or remove published SQL, snapshots, or their journal entries. Append
   a new migration instead. `published-migrations.json` locks the five migrations
   verified on the replacement production site on 2026-09-06 UTC.
3. Run `npm run check:migrations` (also required by `npm run build`). It checks
   published hashes, journal order, fresh installation, upgrading every previous
   prefix, retrying through a test ledger, integrity and existing chat preservation.
   These SQLite checks do not emulate all D1 behaviour or Sites' actual ledger.
4. Review SQL for destructive operations and D1 compatibility. Prefer additive
   changes; use expand/backfill/contract for renames or removals. For any operation
   risking data, require a verified export/backup and restore procedure first.
5. Publish one version at a time and wait for terminal status. Verify live tables
   and API responses. After confirmed application, append the new SQL/snapshot
   hashes and exact journal entries to the lock file; do not regenerate old hashes.

## If publishing fails

- Migrations may already have applied even when the Worker did not publish.
- A Worker rollback does not roll back its database schema.
- Inspect the failed migration, live schema and actual platform ledger before
  retrying. A table-exists error alone does not establish the ledger state.
- Do not remove applied history, add `IF NOT EXISTS` to conceal unknown drift,
  or delete the site. If Sites' ledger is inaccessible, request platform repair.
- Correct only a confirmed failed/unapplied migration. Applied corrections must
  be new append-only migrations.

The old project was deleted by the owner during pre-release. The replacement
successfully applied 0000 through 0004. Deletion/recreation is not our normal
upgrade or recovery procedure.
