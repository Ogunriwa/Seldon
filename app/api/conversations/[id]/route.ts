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
import { eq, asc } from 'drizzle-orm';
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
    .orderBy(asc(messages.createdAt));

  return Response.json({ conversation, messages: msgs });
}

import path from 'path';
import fs from 'fs';

// ── PATCH: Rename a conversation ─────────────────────────────────────────
const patchSchema = z.object({
  title: z.string().min(1).max(200),
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

  const result = await db
    .update(conversations)
    .set({ title: parsed.data.title, updatedAt: new Date() })
    .where(eq(conversations.id, id));

  if (result.changes === 0) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json({ ok: true });
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
        : path.join(process.cwd(), filePath);
      fs.promises.unlink(absPath).catch(() => {});
    }
  }

  return Response.json({ ok: true });
}
