import { db } from '@/lib/db/client';
import { conversations } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { generateId } from 'ai';
import { z } from 'zod';

export async function GET() {
  const rows = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.updatedAt));

  return Response.json({ conversations: rows });
}

const createSchema = z.object({
  model: z.string().min(1),
  firstMessage: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const { model, firstMessage } = parsed.data;
  const title = firstMessage.replace(/^[#?/\s]+/, '').trim().slice(0, 40) || 'New chat';
  const now = new Date();
  const id = generateId();

  await db.insert(conversations).values({
    id,
    title,
    model,
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({ id, title });
}
