/**
 * API Route: /api/projects/[id]/memories
 * Methods: GET, POST
 * 
 * Called by:
 *   - MemoryModal (POST to create a new memory)
 *   - (Potentially other components for GET to list memories)
 * 
 * This route lists the memories linked to a project, and processes the
 * creation of new memories.
 */

// ── Imports ─────────────────────────────────────────────────────────────────
import { db } from '@/lib/db/client';
import { memories } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateId } from 'ai';
import { z } from 'zod';

// ── GET: List Memories ──────────────────────────────────────────────────────
/* 
 * Fetches all memory blocks for a project, sorting pinned memories first, 
 * then by most recently created.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;

  const rows = await db
    .select()
    .from(memories)
    .where(eq(memories.projectId, projectId))
    .orderBy(desc(memories.isPinned), desc(memories.createdAt));

  return Response.json({ memories: rows });
}

// ── POST: Create Memory ─────────────────────────────────────────────────────
// Schema for new memory payload
const createMemorySchema = z.object({
  content: z.string().min(1).max(50000),
  isPinned: z.boolean().optional(),
  source: z.enum(['manual', 'extracted']).optional(),
});

import { checkPinnedBudget, pinnedLimitResponse } from '@/lib/chat/memory-limit';

/* 
 * Stores a new project memory in the database. 
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = createMemorySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { content, isPinned, source } = parsed.data;
  
  if (isPinned) {
    const check = await checkPinnedBudget(projectId, content);
    if (check.exceeds) return pinnedLimitResponse(check.next, check.limit);
  }

  const memoryId = generateId();
  const now = new Date();

  // Create the memory record
  await db.insert(memories).values({
    id: memoryId,
    projectId,
    content,
    isPinned: isPinned ?? false,
    source: source || 'manual',
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({
    id: memoryId,
    projectId,
    content,
    isPinned: isPinned ?? false,
    source: source || 'manual',
    createdAt: now,
    updatedAt: now,
  });
}
