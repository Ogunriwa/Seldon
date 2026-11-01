import { db } from '@/lib/db/client';
import { memories } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { estimateTokens } from '../limits';

/** Pinned memories, most recently updated first, kept until the cap is reached (skip, don't stop). */
export async function loadPinnedMemories(projectId: string, tokenLimit: number) {
  const rows = await db
    .select({ content: memories.content })
    .from(memories)
    .where(and(eq(memories.projectId, projectId), eq(memories.isPinned, true)))
    .orderBy(desc(memories.updatedAt));

  const kept: string[] = [];
  let used = 0;
  for (const { content } of rows) {
    const cost = estimateTokens(content) + 1; // +1 for the "- " bullet and newline
    if (used + cost > tokenLimit) continue;
    kept.push(content);
    used += cost;
  }
  return { items: kept, dropped: rows.length - kept.length };
}
