import { sqliteTable, integer, text, index, primaryKey } from 'drizzle-orm/sqlite-core';
export const githubSessions = sqliteTable('github_sessions', {
  id: text('id').primaryKey(), token: text('token').notNull(),
  userId: integer('user_id').notNull(), login: text('login').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, t => [index('idx_github_session_expiry').on(t.expiresAt)]);
export const buildingSettings = sqliteTable('building_settings', {
  repositoryId: integer('repository_id').primaryKey(),
  ownerId: integer('owner_id').notNull(),
  name: text('name').notNull(),
  settings: text('settings').notNull(),
  updatedBy: integer('updated_by').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
export const roadRegistrations = sqliteTable('road_registrations', {
  name: text('name').primaryKey(),
  payload: text('payload'),
  checkedAt: integer('checked_at').notNull(),
  refreshAfter: integer('refresh_after').notNull(),
}, t => [index('idx_road_refresh').on(t.refreshAfter)]);
export const roadSubmissionLimits = sqliteTable('road_submission_limits', {
  id: text('id').primaryKey(),
  updatedAt: integer('updated_at').notNull(),
}, t => [index('idx_road_limits_time').on(t.updatedAt)]);
export const chickenSchedule = sqliteTable('chicken_schedule', {
  id: integer('id').primaryKey(), round: integer('round').notNull(),
  stopAt: integer('stop_at').notNull(), startedAt: integer('started_at').notNull(),
  departAt: integer('depart_at').notNull(), crossingCount: integer('crossing_count').notNull(),
  baseDistance: integer('base_distance').notNull(),
});
export const chickenClicks = sqliteTable('chicken_clicks', {
  id: text('id').notNull(), round: integer('round').notNull(), total: integer('total').notNull(),
}, t => [primaryKey({ columns: [t.id, t.round] }), index('idx_chicken_round').on(t.round)]);
export const chickenLimits = sqliteTable('chicken_limits', {
  id: text('id').primaryKey(), updatedAt: integer('updated_at').notNull(), nonce: text('nonce').notNull(),
}, t => [index('idx_chicken_limits_time').on(t.updatedAt)]);
export const visitorPresence = sqliteTable('visitor_presence', {
  id: text('id').primaryKey(),
  lastSeen: integer('last_seen').notNull(),
}, table => [index('idx_presence_last_seen').on(table.lastSeen)]);
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
