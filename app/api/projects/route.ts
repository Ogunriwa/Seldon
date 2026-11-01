/**
 * API Route: /api/projects
 * Methods: GET, POST
 * 
 * Called by:
 *   - ProjectsDashboard (GET to list projects)
 *   - StartProjectModal (POST to create project)
 * 
 * This route handles project listing and creation.
 */

// ── Imports ─────────────────────────────────────────────────────────────────
import { db } from '@/lib/db/client';
import { projects, conversations } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';
import { generateId } from 'ai';
import { z } from 'zod';

// ── GET: List Projects ──────────────────────────────────────────────────────
/* 
 * Retrieves all projects, ordered by most recently updated.
 * Also computes aggregate count for threads linked to each project.
 */
export async function GET() {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      emoji: projects.emoji,
      description: projects.description,
      instructions: projects.instructions,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      threadsCount: sql<number>`(SELECT COUNT(*) FROM ${conversations} WHERE ${conversations.projectId} = ${projects.id})`,
    })
    .from(projects)
    .orderBy(desc(projects.updatedAt));

  return Response.json({ projects: rows });
}

// ── POST: Create Project ────────────────────────────────────────────────────
// Schema for project creation payload
const createSchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().max(10).optional(),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(20000).optional(),
});

/* 
 * Project Creation Flow:
 * 1. Validate the incoming JSON payload.
 * 2. Insert the new project into the database.
 */
export async function POST(req: Request) {
  // Parse and validate request
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const { name, emoji, description, instructions } = parsed.data;
  const now = new Date();
  const projectId = generateId();

  // Create Project record
  await db.insert(projects).values({
    id: projectId,
    name,
    emoji: emoji || '📓',
    description: description || '',
    instructions: instructions || '',
    createdAt: now,
    updatedAt: now,
  });

  // Return the newly created project info
  return Response.json({
    id: projectId,
    name,
    emoji: emoji || '📓',
    description: description || '',
    instructions: instructions || '',
  });
}
