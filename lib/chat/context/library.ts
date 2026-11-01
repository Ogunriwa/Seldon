import { db } from '@/lib/db/client';
import { libraries } from '@/lib/db/schema';
import { eq, and, ne, isNotNull, asc } from 'drizzle-orm';

export type ContextDoc = { name: string; source: 'library' | 'attachment'; text: string };

export async function loadLibraryDocs(projectId: string): Promise<ContextDoc[]> {
  const rows = await db
    .select({ filename: libraries.filename, extractedText: libraries.extractedText })
    .from(libraries)
    .where(
      and(
        eq(libraries.projectId, projectId),         // project-wide (threadId ignored)
        eq(libraries.includeInContext, true),
        ne(libraries.type, 'weblink'),              // deprecated; old rows stay visible but never reach the model
        isNotNull(libraries.extractedText),
      ),
    )
    .orderBy(asc(libraries.createdAt));             // stable order keeps the KV-cache prefix reusable

  return rows.map((r) => ({ name: r.filename, source: 'library', text: r.extractedText! }));
}
