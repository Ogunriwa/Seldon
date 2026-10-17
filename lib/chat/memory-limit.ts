import { db } from '@/lib/db/client';
import { memories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { estimatePinnedTokens, pinnedMemoryLimit } from './limits';

/** Would the project's pinned total exceed the limit if `content` were pinned (replacing `excludeId`)? */
export async function checkPinnedBudget(projectId: string, content: string, excludeId?: string) {
  const rows = await db
    .select({ id: memories.id, content: memories.content })
    .from(memories)
    .where(and(eq(memories.projectId, projectId), eq(memories.isPinned, true)));

  const others = rows.filter((r) => r.id !== excludeId).map((r) => r.content);
  const next = estimatePinnedTokens([...others, content]);
  const limit = pinnedMemoryLimit(); 
  return { exceeds: next > limit, next, limit };
}

export const pinnedLimitResponse = (next: number, limit: number) =>
  Response.json(
    { error: `Pinned memories would use ~${next.toLocaleString()} tokens (limit ${limit.toLocaleString()}). Unpin or shorten a memory first.`, code: 'PINNED_LIMIT' },
    { status: 409 },
  );
