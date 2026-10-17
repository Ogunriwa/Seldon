import { db } from '@/lib/db/client';
import { messages as messagesTable, conversations, attachments } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { generateId, type UIMessage } from 'ai';

export async function persistMessages({
  finalMessages,
  conversationId,
  model,
  pendingAttachmentIds,
}: {
  finalMessages: UIMessage[];
  conversationId: string;
  model: string;
  pendingAttachmentIds?: string[];
}) {
  const existingIds = new Set(
    (
      await db
        .select({ id: messagesTable.id })
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conversationId))
    ).map((r) => r.id),
  );

  let firstNewUserMessageId: string | undefined;

  for (const msg of finalMessages) {
    const id = msg.id || generateId();
    if (existingIds.has(id)) continue;
    existingIds.add(id);

    const text = msg.parts
      .map((p) => (p.type === 'text' ? p.text : ''))
      .join('');

    const reasoning = msg.parts
      .filter((p) => p.type === 'reasoning')
      .map((p) => (p as { type: 'reasoning'; text: string }).text)
      .join('');

    await db.insert(messagesTable).values({
      id,
      conversationId,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: text,
      reasoning: reasoning || null,
      model: msg.role === 'assistant' ? model : null,
      createdAt: new Date(),
    });

    // Track the first new user message for linking attachments
    if (msg.role === 'user' && !firstNewUserMessageId) {
      firstNewUserMessageId = id;
    }
  }

  // Link pending attachments to the user message
  if (
    firstNewUserMessageId &&
    pendingAttachmentIds &&
    pendingAttachmentIds.length > 0
  ) {
    await db
      .update(attachments)
      .set({ messageId: firstNewUserMessageId })
      .where(inArray(attachments.id, pendingAttachmentIds));
  }

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}
