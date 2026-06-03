import { db } from '@/lib/db/client';
import { conversations, messages, attachments } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Chat } from '@/components/chat';
import type { UIMessage } from 'ai';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const conversation = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .get();

  if (!conversation) notFound();

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  const initialMessages: UIMessage[] = msgs.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: m.content }],
    createdAt: m.createdAt,
  }));

  // Load attachments grouped by messageId
  const allAttachments = await db
    .select()
    .from(attachments)
    .where(eq(attachments.conversationId, id));

  const attachmentsByMessage: Record<string, Array<{
    id: string;
    filename: string;
    mediaType: string;
    sizeBytes: number;
    extractedText: string | null;
    data: string | null;
    error: string | null;
  }>> = {};

  for (const a of allAttachments) {
    if (!a.messageId) continue; // skip unlinked
    if (!attachmentsByMessage[a.messageId]) {
      attachmentsByMessage[a.messageId] = [];
    }
    attachmentsByMessage[a.messageId].push({
      id: a.id,
      filename: a.filename,
      mediaType: a.mediaType,
      sizeBytes: a.sizeBytes,
      extractedText: a.extractedText,
      data: a.data,
      error: a.error,
    });
  }

  return (
    <Chat
      key={id}
      id={id}
      initialMessages={initialMessages}
      initialModel={conversation.model}
      projectId={conversation.projectId}
      initialAttachments={attachmentsByMessage}
    />
  );
}
