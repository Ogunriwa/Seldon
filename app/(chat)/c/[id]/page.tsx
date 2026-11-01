// ── Imports & Database Setup ───────────────────────────────────
// Core database client and schema for threads, messages, and attachments
import { db } from '@/lib/db/client';
import { conversations, messages, attachments, projects } from '@/lib/db/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Chat } from '@/components/chat';
import { ChatHeader } from '@/components/chat/chat-header';
import type { UIMessage } from 'ai';

// ── Conversation Thread Page ──────────────────────────────────
/*
 * Fetches and renders a specific conversation thread by ID.
 * Retrieves all associated messages and attachments, formats them
 * into the AI UI format, and mounts the interactive Chat component.
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1. Validate the conversation exists
  const conversation = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .get();

  if (!conversation) notFound();

  // Fetch project name if it belongs to a project
  let projectName: string | null = null;
  if (conversation.projectId) {
    const project = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, conversation.projectId))
      .get();
    if (project) {
      projectName = project.name;
    }
  }

  // 2. Fetch all messages in the thread, ordered chronologically and tie-broken by insertion order (rowid)
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt), asc(sql`rowid`));

  // Transform database messages to the shape expected by useChat / AI SDK
  const initialMessages: UIMessage[] = msgs.map((m) => {
    const parts: UIMessage['parts'] = [];
    if (m.reasoning) {
      parts.push({ type: 'reasoning' as const, text: m.reasoning });
    }
    parts.push({ type: 'text' as const, text: m.content });

    return {
      id: m.id,
      role: m.role as 'user' | 'assistant',
      parts,
      createdAt: m.createdAt,
    };
  });

  // 3. Load all attachments for this conversation
  const allAttachments = await db
    .select()
    .from(attachments)
    .where(eq(attachments.conversationId, id));

  // Group attachments by message ID to easily hydrate the UI messages
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

  // ── Render Chat UI ──────────────────────────────────────────
  const chatComponent = (
    <Chat
      key={id}
      id={id}
      initialMessages={initialMessages}
      initialModel={conversation.model}
      projectId={conversation.projectId}
      projectName={projectName}
      initialAttachments={attachmentsByMessage}
    />
  );

  if (conversation.projectId) {
    return (
      <div className="flex flex-col h-full w-full bg-[rgba(255,255,255,0.1)]">
        <ChatHeader
          conversationId={id}
          initialTitle={conversation.title || 'New Thread'}
          projectId={conversation.projectId}
          projectName={projectName}
        />
        <div className="flex-1 min-h-0 overflow-hidden p-[5px]">
          <div className="bg-white h-full w-full rounded-[20px] overflow-hidden flex flex-col shadow-sm">
            {chatComponent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <ChatHeader
        conversationId={id}
        initialTitle={conversation.title || 'New chat'}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        {chatComponent}
      </div>
    </div>
  );
}
