// ── Imports & Database ──────────────────────────────────────────
// Drizzle client and schema models for fetching conversation histories
import { db } from '@/lib/db/client';
import { conversations } from '@/lib/db/schema';
import { desc, isNull } from 'drizzle-orm';
import { QuickChatsList } from '@/components/chat/quick-chats-list';

// ── Quick Chats Page ────────────────────────────────────────────
/*
 * Fetches and displays a list of "Quick Chats" (conversations not 
 * associated with a specific project/workspace).
 */
export default async function ChatsPage() {
  // Query for all conversations without a projectId, ordered by most recently updated
  const standaloneChats = await db
    .select()
    .from(conversations)
    .where(isNull(conversations.projectId))
    .orderBy(desc(conversations.updatedAt));

  return <QuickChatsList initialChats={standaloneChats} />;
}
