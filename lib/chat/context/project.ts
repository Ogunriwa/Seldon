import { db } from '@/lib/db/client';
import { projects, conversations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function loadProject(conversationId: string) {
  const convo = await db
    .select({ projectId: conversations.projectId })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .get();

  if (!convo?.projectId) return null;

  const project = await db
    .select({ id: projects.id, instructions: projects.instructions })
    .from(projects)
    .where(eq(projects.id, convo.projectId))
    .get();

  return project ? { projectId: project.id, instructions: project.instructions } : null;
}
