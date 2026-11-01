/**
 * API Route: /api/projects/[id]/memories/[memoryId]
 * Methods: PATCH, DELETE
 * 
 * Called by:
 *   - MemoryModal (PATCH to edit existing memory content/pinned state)
 *   - MemoriesTab (DELETE to remove a memory item)
 * 
 * This route allows modification and removal of individual project memories.
 */

// ── Imports ─────────────────────────────────────────────────────────────────
import { db } from '@/lib/db/client';
import { memories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

import { checkPinnedBudget, pinnedLimitResponse } from '@/lib/chat/memory-limit';

// ── PATCH: Update Memory ────────────────────────────────────────────────────
// Schema for partial memory updates
const patchMemorySchema = z.object({
  content: z.string().min(1).max(50000).optional(),
  isPinned: z.boolean().optional(),
});

/* 
 * Updates properties (content or pinned state) of an existing memory.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; memoryId: string }> },
) {
  const { id: projectId, memoryId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = patchMemorySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await db.select().from(memories)
    .where(and(eq(memories.id, memoryId), eq(memories.projectId, projectId))).get();
  if (!existing) return Response.json({ error: 'Memory not found' }, { status: 404 });

  const willBePinned = parsed.data.isPinned ?? existing.isPinned;
  if (willBePinned) {
    const check = await checkPinnedBudget(projectId, parsed.data.content ?? existing.content, memoryId);
    if (check.exceeds) return pinnedLimitResponse(check.next, check.limit);
  }

  // Collect update fields dynamically
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.content !== undefined) updates.content = parsed.data.content;
  if (parsed.data.isPinned !== undefined) updates.isPinned = parsed.data.isPinned;

  // Execute DB update
  const result = await db
    .update(memories)
    .set(updates)
    .where(and(eq(memories.id, memoryId), eq(memories.projectId, projectId)));

  if (result.changes === 0) {
    return Response.json({ error: 'Memory not found' }, { status: 404 });
  }

  return Response.json({ ok: true });
}

// ── DELETE: Remove Memory ───────────────────────────────────────────────────
/* 
 * Deletes a memory from the project database entirely.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; memoryId: string }> },
) {
  const { id: projectId, memoryId } = await params;

  const result = await db
    .delete(memories)
    .where(and(eq(memories.id, memoryId), eq(memories.projectId, projectId)));

  if (result.changes === 0) {
    return Response.json({ error: 'Memory not found' }, { status: 404 });
  }

  return Response.json({ ok: true });
}
