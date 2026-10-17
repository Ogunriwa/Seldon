/**
 * API Route: /api/conversations
 * Methods: GET, POST
 *
 * Called by:
 *   - components/home/home-view.tsx          (POST — create a Quick Chat from Home Screen)
 *   - components/chat.tsx                    (POST — create a conversation before first message)
 *   - app/(chat)/c/page.tsx                  (Server Component reads DB directly, not this route)
 *
 * This route handles listing and creating conversations (both Quick Chats and
 * project-scoped Threads). The GET handler supports query params to filter:
 *   - ?projectId=xyz   → only threads belonging to that project
 *   - ?quickChatsOnly=true → only standalone chats (projectId IS NULL)
 */
import { db } from '@/lib/db/client';
import { conversations } from '@/lib/db/schema';
import { desc, eq, isNull } from 'drizzle-orm';
import { generateId } from 'ai';
import { z } from 'zod';

// ── GET: List conversations with optional filtering ──────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const quickChatsOnly = searchParams.get('quickChatsOnly') === 'true';

  let query = db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.updatedAt));

  /*
   * Filter Logic:
   * - If projectId is provided, scope to that project's threads only.
   * - If quickChatsOnly, return conversations with NO project (standalone Home Screen chats).
   * - Otherwise, return all conversations unfiltered.
   */
  let rows;
  if (projectId) {
    rows = await query.where(eq(conversations.projectId, projectId));
  } else if (quickChatsOnly) {
    rows = await query.where(isNull(conversations.projectId));
  } else {
    rows = await query;
  }

  return Response.json({ conversations: rows });
}

// ── POST: Create a new conversation ──────────────────────────────────────
// Validates with Zod: requires model and firstMessage. projectId is optional —
// if omitted, this becomes a standalone Quick Chat; if provided, it's a project Thread.
const createSchema = z.object({
  model: z.string().min(1),
  firstMessage: z.string().min(1),
  projectId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
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

  const { model, firstMessage, projectId } = parsed.data;

  /* Derive a short title from the user's first message for sidebar display.
   * Strips leading markdown/special characters and caps at 40 chars. */
  const title = firstMessage.replace(/^[#?/\s]+/, '').trim().slice(0, 40) || 'New chat';
  const now = new Date();
  const id = generateId();

  // Insert conversation row — projectId: null means Quick Chat, string means project Thread
  await db.insert(conversations).values({
    id,
    title,
    projectId: projectId ?? null,
    model,
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({ id, title });
}
