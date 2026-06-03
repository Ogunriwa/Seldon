import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  instructions: text('instructions').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
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

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  messageId: text('message_id')
    .references(() => messages.id, { onDelete: 'cascade' }),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mediaType: text('media_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  extractedText: text('extracted_text'),
  // Base64-encoded bytes for images (vision models). Null for text/PDF, which
  // use extractedText instead.
  data: text('data'),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
