import { db } from '@/lib/db/client';
import { conversations, messages } from '@/lib/db/schema';
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

  return (
    <Chat key={id} id={id} initialMessages={initialMessages} initialModel={conversation.model} />
  );
}
