/**
 * API Route: /api/projects/[id]/threads
 * Methods: GET, POST
 * 
 * Called by:
 *   - ThreadsTab (POST to create a new thread context)
 * 
 * This route lists all threads (conversations) for a project and allows creating new ones.
 */

// ── Imports ─────────────────────────────────────────────────────────────────
import { db } from '@/lib/db/client';
import { conversations } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateId } from 'ai';
import { z } from 'zod';
import { deriveInitialTitle } from '@/lib/chat/title';

// ── GET: List Threads ───────────────────────────────────────────────────────
/* 
 * Fetches all conversation threads associated with a specific project,
 * ordered by most recently updated.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.projectId, id))
    .orderBy(desc(conversations.updatedAt));

  return Response.json({ threads: rows });
}

// ── POST: Create Thread ─────────────────────────────────────────────────────
// Schema for thread creation
const createThreadSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  model: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/* 
 * Thread Creation Flow:
 * 1. Parse thread details.
 * 2. Insert new conversation record scoped to the project.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = createThreadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const model = parsed.data.model || 'qwen2.5:latest';
  const threadId = generateId();
  const now = new Date();
  const title = parsed.data.title ? deriveInitialTitle(parsed.data.title, 'New Thread') : 'New Thread';

  // Create conversation record
  await db.insert(conversations).values({
    id: threadId,
    title,
    projectId,
    model,
    status: 'active',
    summary: parsed.data.summary || null,
    tags: JSON.stringify(parsed.data.tags || []),
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({
    id: threadId,
    title,
    projectId,
    model,
    status: 'active',
    summary: parsed.data.summary || null,
    tags: parsed.data.tags || [],
    createdAt: now,
    updatedAt: now,
  });
}
