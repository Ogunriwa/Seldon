import { describe, it, expect, afterEach } from 'vitest';
import { db } from '@/lib/db/client';
import { projects, memories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from 'ai';
import { checkPinnedBudget, pinnedLimitResponse } from '@/lib/chat/memory-limit';
import { CHARS_PER_TOKEN, pinnedMemoryLimit } from '@/lib/chat/limits';

describe('Pinned Memory Budget Enforcement (memory-limit.ts)', () => {
  const createdProjectIds: string[] = [];

  afterEach(async () => {
    for (const id of createdProjectIds) {
      await db.delete(projects).where(eq(projects.id, id));
    }
    createdProjectIds.length = 0;
  });

  it('allows pinning within the 25% APP_MAX_CTX ceiling (4,096 tokens) and blocks overflow with 409 PINNED_LIMIT', async () => {
    const projectId = `test-proj-${generateId()}`;
    createdProjectIds.push(projectId);

    const now = new Date();
    await db.insert(projects).values({
      id: projectId,
      name: 'Memory Budget Test Project',
      createdAt: now,
      updatedAt: now,
    });

    const limit = pinnedMemoryLimit(); // 4,096 tokens
    expect(limit).toBe(4096);

    // Seed an existing pinned memory taking 3,000 tokens (12,000 chars)
    const mem1Id = generateId();
    await db.insert(memories).values({
      id: mem1Id,
      projectId,
      content: 'A'.repeat(3000 * CHARS_PER_TOKEN),
      isPinned: true,
      createdAt: now,
      updatedAt: now,
    });

    // 1. Adding a 1,000-token memory => 4,000 <= 4,096 (allowed)
    const okCheck = await checkPinnedBudget(projectId, 'B'.repeat(1000 * CHARS_PER_TOKEN));
    expect(okCheck.exceeds).toBe(false);
    expect(okCheck.next).toBe(4000);

    // 2. Adding a 1,200-token memory => 4,200 > 4,096 (exceeds)
    const overCheck = await checkPinnedBudget(projectId, 'C'.repeat(1200 * CHARS_PER_TOKEN));
    expect(overCheck.exceeds).toBe(true);
    expect(overCheck.next).toBe(4200);

    // Verify the 409 response contract
    const res = pinnedLimitResponse(overCheck.next, overCheck.limit);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('PINNED_LIMIT');

    // 3. Differential edit check: editing mem1Id itself to 3,500 tokens excludes its old 3,000 tokens
    const editCheck = await checkPinnedBudget(projectId, 'D'.repeat(3500 * CHARS_PER_TOKEN), mem1Id);
    expect(editCheck.exceeds).toBe(false);
    expect(editCheck.next).toBe(3500);
  });
});
