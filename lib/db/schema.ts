import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/*
 * ── Projects Table ──────────────────────────────────────────
 * Represents the top-level workspaces in Seldon.
 * Every agent, conversation, memory, and library belongs to a Project.
 * Routes: POST /api/projects, GET /api/projects/[id]
 */
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default('📓'),
  description: text('description').notNull().default(''),
  instructions: text('instructions').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/*
 * ── Conversations (Threads) Table ─────────────────────────────
 * Represents a chat session within a Project or standalone Quick Chat.
 * Messages and Attachments belong to a Conversation.
 * Routes: POST /api/projects/[projectId]/threads, GET /api/conversations/[id]
 */
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  model: text('model').notNull(),
  status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
  summary: text('summary'),
  tags: text('tags').notNull().default('[]'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const threads = conversations;

/*
 * ── Libraries Table ───────────────────────────────────────────
 * Stores metadata and extracted text for files or links uploaded
 * to a Project. Used as reference context for project threads.
 * Routes: POST /api/projects/[projectId]/libraries
 */
export const libraries = sqliteTable('libraries', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mediaType: text('media_type').notNull(),
  sizeBytes: integer('size_bytes').notNull().default(0),
  extractedText: text('extracted_text'),
  type: text('type', { enum: ['reference', 'artifact', 'weblink'] })
    .notNull()
    .default('reference'),
  url: text('url'),
  includeInContext: integer('include_in_context', { mode: 'boolean' })
    .notNull()
    .default(true),
  addedBy: text('added_by').notNull().default('User'),
  threadId: text('thread_id').references(() => conversations.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/*
 * ── Memories Table ────────────────────────────────────────────
 * Stores snippets of information or facts that a Project retains
 * over time. Can be pinned manually or extracted automatically.
 * Routes: POST /api/projects/[projectId]/memories
 */
export const memories = sqliteTable('memories', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  source: text('source', { enum: ['manual', 'extracted'] }).notNull().default('manual'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/*
 * ── Messages Table ────────────────────────────────────────────
 * Represents individual chat messages within a Conversation.
 * Routes: POST /api/threads/[threadId]/messages
 */
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  reasoning: text('reasoning'),
  model: text('model'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/*
 * ── Attachments Table ─────────────────────────────────────────
 * Stores files attached directly to a specific Message in a Thread.
 * Differs from Libraries, which are Project-level resources.
 */
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
  data: text('data'),
  filePath: text('file_path'),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
