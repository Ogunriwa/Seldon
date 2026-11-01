/**
 * API Route: /api/projects/[id]
 * Methods: GET, PATCH, DELETE
 * 
 * Called by:
 *   - ProjectDetail (GET for project info, DELETE to remove project)
 *   - InstructionsTab (PATCH to update instructions)
 * 
 * This route manages individual project operations (retrieval, update, deletion).
 */

// ── Imports ─────────────────────────────────────────────────────────────────
import { db } from '@/lib/db/client';
import { projects, conversations, attachments } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// ── GET: Retrieve Project ───────────────────────────────────────────────────
/* 
 * Fetches a single project by its ID. 
 * Returns 404 if the project doesn't exist.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .get();

  if (!project) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json({ project });
}

// ── PATCH: Update Project ───────────────────────────────────────────────────
// Schema for partial project updates
const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  emoji: z.string().max(10).optional(),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(20000).optional(),
});

/* 
 * Updates a project's details (name, emoji, description, instructions).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  // Construct dynamic update object based on provided fields
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.emoji !== undefined) updates.emoji = parsed.data.emoji;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.instructions !== undefined) updates.instructions = parsed.data.instructions;

  // Execute project update
  const result = await db
    .update(projects)
    .set(updates)
    .where(eq(projects.id, id));

  if (result.changes === 0) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json({ ok: true });
}

// ── DELETE: Remove Project ──────────────────────────────────────────────────
/* 
 * Deletes a project by its ID.
 * Unlinks any disk image attachments belonging to threads in this project
 * before SQLite cascade-deletes conversations, messages, libraries, and memories.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const projectThreads = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.projectId, id));

  if (projectThreads.length > 0) {
    const threadIds = projectThreads.map((t) => t.id);
    const filesToDelete = await db
      .select({ filePath: attachments.filePath })
      .from(attachments)
      .where(inArray(attachments.conversationId, threadIds));

    for (const f of filesToDelete) {
      if (f.filePath) {
        try {
          const fullPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), f.filePath);
          if (fs.existsSync(fullPath)) {
            await fs.promises.unlink(fullPath);
          }
        } catch (err) {
          console.error(`Failed to delete attachment file ${f.filePath}:`, err);
        }
      }
    }
  }

  const result = await db
    .delete(projects)
    .where(eq(projects.id, id));

  if (result.changes === 0) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json({ ok: true });
}
