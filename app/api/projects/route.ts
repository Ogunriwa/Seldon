import { db } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { generateId } from 'ai';
import { z } from 'zod';

export async function GET() {
  const rows = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.updatedAt));

  return Response.json({ projects: rows });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  instructions: z.string().max(10000).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const { name, instructions } = parsed.data;
  const now = new Date();
  const id = generateId();

  await db.insert(projects).values({
    id,
    name,
    instructions: instructions ?? '',
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({ id, name });
}
