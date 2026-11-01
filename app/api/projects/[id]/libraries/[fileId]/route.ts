/**
 * API Route: /api/projects/[id]/libraries/[fileId]
 * Methods: PATCH, DELETE
 * 
 * Called by:
 *   - LibrariesTab (PATCH to toggle context inclusion/rename, DELETE to remove library items)
 * 
 * This route allows updating and removing specific library entries for a project.
 */

// ── Imports ─────────────────────────────────────────────────────────────────
import { db } from '@/lib/db/client';
import { libraries } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// ── PATCH: Update Library Item ──────────────────────────────────────────────
// Schema for updating library entries
const patchSchema = z.object({
  includeInContext: z.boolean().optional(),
  filename: z.string().optional(),
});

/* 
 * Processes changes to a library file's metadata, typically used 
 * to toggle if the file is injected into the LLM context.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id: projectId, fileId } = await params;
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

  // Build the updates object
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.includeInContext !== undefined) {
    updates.includeInContext = parsed.data.includeInContext;
  }
  if (parsed.data.filename !== undefined) {
    updates.filename = parsed.data.filename;
  }

  // Update in DB
  const result = await db
    .update(libraries)
    .set(updates)
    .where(and(eq(libraries.id, fileId), eq(libraries.projectId, projectId)));

  if (result.changes === 0) {
    return Response.json({ error: 'File not found' }, { status: 404 });
  }

  return Response.json({ ok: true });
}

// ── DELETE: Remove Library Item ─────────────────────────────────────────────
/* 
 * Deletes a library record from the database.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id: projectId, fileId } = await params;

  const result = await db
    .delete(libraries)
    .where(and(eq(libraries.id, fileId), eq(libraries.projectId, projectId)));

  if (result.changes === 0) {
    return Response.json({ error: 'File not found' }, { status: 404 });
  }

  return Response.json({ ok: true });
}
