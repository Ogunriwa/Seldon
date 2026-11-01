/**
 * API Route: /api/conversations/[id]
 * Methods: GET, PATCH, DELETE
 *
 * Called by:
 *   - components/chat/quick-chats-list.tsx    (DELETE — remove a quick chat from history)
 *   - components/chat.tsx                     (GET — could fetch conversation details)
 *
 * Single-conversation operations: retrieve with messages, rename, or delete.
 * Next.js 15+ passes `params` as a Promise (async unwrap required).
 */
import { db } from '@/lib/db/client';
import { conversations, messages, attachments } from '@/lib/db/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { z } from 'zod';

// ── GET: Retrieve conversation + its message history ─────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const conversation = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .get();

  if (!conversation) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt), asc(sql`rowid`));

  return Response.json({ conversation, messages: msgs });
}

import path from 'path';
import fs from 'fs';

// ── PATCH: Rename a conversation ─────────────────────────────────────────
const patchSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Malformed or empty JSON request body.' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  // Do not bump updatedAt on rename so the chat stays in its chronological position
  const result = await db
    .update(conversations)
    .set({ title: parsed.data.title })
    .where(eq(conversations.id, id));

  if (result.changes === 0) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json({ ok: true, title: parsed.data.title });
}

// ── DELETE: Remove a conversation and its messages ───────────────────────
// Cascade deletes for messages/attachments are handled by SQLite foreign keys.
// Physical disk files stored in data/uploads are cleaned up asynchronously.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // 1. Fetch file paths for disk-stored attachments before deleting the database rows
  const filesToDelete = await db
    .select({ filePath: attachments.filePath })
    .from(attachments)
    .where(eq(attachments.conversationId, id));

  // 2. Delete the conversation row (SQLite foreign keys cascade to messages and attachments)
  const result = await db
    .delete(conversations)
    .where(eq(conversations.id, id));

  if (result.changes === 0) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // 3. Clean up physical files from disk (Option A)
  for (const { filePath } of filesToDelete) {
    if (filePath) {
      const absPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(/*turbopackIgnore: true*/ process.cwd(), filePath);
      fs.promises.unlink(absPath).catch(() => {});
    }
  }

  return Response.json({ ok: true });
}
