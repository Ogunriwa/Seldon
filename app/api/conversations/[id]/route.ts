import { db } from '@/lib/db/client';
import { conversations, messages } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';

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

const patchSchema = z.object({
  title: z.string().min(1).max(200),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const result = await db
    .delete(conversations)
    .where(eq(conversations.id, id));

  if (result.changes === 0) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json({ ok: true });
}
