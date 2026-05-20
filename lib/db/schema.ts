import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  model: text('model').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  // Plain text in Phase 2. When tool calls land, this becomes JSON-serialized
  // parts and needs a format discriminator (or try/catch JSON.parse) to
  // distinguish old plain-text rows from new JSON rows.
  content: text('content').notNull(),
  model: text('model'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
