import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';
export const repositoryWorldCache = sqliteTable('repository_world_cache', {
  id: text('id').primaryKey(),
  payload: text('payload').notNull(),
  refreshedAt: integer('refreshed_at').notNull(),
  refreshAfter: integer('refresh_after').notNull(),
});
export const messages = sqliteTable(
  'chat_messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    body: text('body').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_chat_user_time').on(table.userId, table.createdAt)],
);
