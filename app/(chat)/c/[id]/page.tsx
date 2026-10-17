// ── Imports & Database Setup ───────────────────────────────────
// Core database client and schema for threads, messages, and attachments
import { db } from '@/lib/db/client';
import { conversations, messages, attachments, projects } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Chat } from '@/components/chat';
import type { UIMessage } from 'ai';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

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

  // 2. Fetch all messages in the thread, ordered chronologically
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

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
        <div className="flex items-center px-[10px] py-[20px] w-full shrink-0">
          <Link
            href={`/projects/${conversation.projectId}`}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <div className="h-[21.978px] relative shrink-0 w-[25px]">
              <svg width="26" height="22" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 size-full">
                <g clipPath="url(#clip0_652_1623)">
                  <rect width="7.93285" height="21.1157" rx="0.580884" transform="matrix(-0.990725 0.13588 0.142543 0.989789 22.8594 0)" fill="#60D394"/>
                  <rect x="-0.172443" y="0.228859" width="3.46594" height="10.4366" rx="0.377575" transform="matrix(-0.990725 0.13588 0.142543 0.989789 20.8428 2.20546)" fill="white"/>
                  <rect x="-0.172443" y="0.228859" width="3.46594" height="10.4366" rx="0.377575" transform="matrix(-0.990725 0.13588 0.142543 0.989789 20.8428 2.20546)" stroke="black" strokeWidth="0.406619"/>
                  <rect x="-0.172443" y="0.228859" width="3.07869" height="3.04771" rx="1.52385" transform="matrix(-0.990725 0.13588 0.142543 0.989789 22.8018 15.8129)" fill="white"/>
                  <rect x="-0.172443" y="0.228859" width="3.07869" height="3.04771" rx="1.52385" transform="matrix(-0.990725 0.13588 0.142543 0.989789 22.8018 15.8129)" stroke="black" strokeWidth="0.406619"/>
                </g>
                <rect x="-0.172443" y="0.228859" width="7.52623" height="20.7091" rx="0.377575" transform="matrix(-0.990725 0.13588 0.142543 0.989789 22.4835 0.0257685)" stroke="black" strokeWidth="0.406619"/>
                <rect x="0.203309" y="1.07636" width="7.52989" height="20.6988" rx="0.377575" fill="#57C4E5"/>
                <rect x="0.203309" y="1.07636" width="7.52989" height="20.6988" rx="0.377575" stroke="black" strokeWidth="0.406619"/>
                <rect x="2.13886" y="3.0119" width="3.46594" height="10.4366" rx="0.377575" fill="white"/>
                <rect x="2.13886" y="3.0119" width="3.46594" height="10.4366" rx="0.377575" stroke="black" strokeWidth="0.406619"/>
                <rect x="2.13886" y="16.76" width="3.07869" height="3.04771" rx="1.52385" fill="white"/>
                <rect x="2.13886" y="16.76" width="3.07869" height="3.04771" rx="1.52385" stroke="black" strokeWidth="0.406619"/>
                <mask id="path-8-inside-1_652_1623" fill="white">
                  <path d="M7.33984 0.873047H14.6955C15.0163 0.873047 15.2764 1.13312 15.2764 1.45393V21.3976C15.2764 21.7184 15.0163 21.9785 14.6955 21.9785H7.92073C7.59992 21.9785 7.33984 21.7184 7.33984 21.3976V0.873047Z"/>
                </mask>
                <path d="M7.33984 0.873047H14.6955C15.0163 0.873047 15.2764 1.13312 15.2764 1.45393V21.3976C15.2764 21.7184 15.0163 21.9785 14.6955 21.9785H7.92073C7.59992 21.9785 7.33984 21.7184 7.33984 21.3976V0.873047Z" fill="#EE6055"/>
                <path d="M7.33984 0.873047V0.466428H6.93322V0.873047H7.33984ZM7.33984 0.873047V1.27967H14.6955V0.873047V0.466428H7.33984V0.873047ZM15.2764 1.45393H14.8697V21.3976H15.2764H15.683V1.45393H15.2764ZM14.6955 21.9785V21.5719H7.92073V21.9785V22.3851H14.6955V21.9785ZM7.33984 21.3976H7.74646V0.873047H7.33984H6.93322V21.3976H7.33984ZM7.92073 21.9785V21.5719C7.82448 21.5719 7.74646 21.4939 7.74646 21.3976H7.33984H6.93322C6.93322 21.943 7.37535 22.3851 7.92073 22.3851V21.9785ZM15.2764 21.3976H14.8697C14.8697 21.4939 14.7917 21.5719 14.6955 21.5719V21.9785V22.3851C15.2409 22.3851 15.683 21.943 15.683 21.3976H15.2764ZM14.6955 0.873047V1.27967C14.7917 1.27967 14.8697 1.35769 14.8697 1.45393H15.2764H15.683C15.683 0.908548 15.2409 0.466428 14.6955 0.466428V0.873047Z" fill="black" mask="url(#path-8-inside-1_652_1623)"/>
                <path d="M7.33984 0.873047V0.466428H6.93322V0.873047H7.33984ZM7.33984 0.873047V1.27967H14.6955V0.873047V0.466428H7.33984V0.873047ZM15.2764 1.45393H14.8697V21.3976H15.2764H15.683V1.45393H15.2764ZM14.6955 21.9785V21.5719H7.92073V21.9785V22.3851H14.6955V21.9785ZM7.33984 21.3976H7.74646V0.873047H7.33984H6.93322V21.3976H7.33984ZM7.92073 21.9785V21.5719C7.82448 21.5719 7.74646 21.4939 7.74646 21.3976H7.33984H6.93322C6.93322 21.943 7.37535 22.3851 7.92073 22.3851V21.9785ZM15.2764 21.3976H14.8697C14.8697 21.4939 14.7917 21.5719 14.6955 21.5719V21.9785V22.3851C15.2409 22.3851 15.683 21.943 15.683 21.3976H15.2764ZM14.6955 0.873047V1.27967C14.7917 1.27967 14.8697 1.35769 14.8697 1.45393H15.2764H15.683C15.683 0.908548 15.2409 0.466428 14.6955 0.466428V0.873047Z" fill="black" fillOpacity="0.2" mask="url(#path-8-inside-1_652_1623)"/>
                <rect x="9.48065" y="3.0119" width="3.46594" height="10.4366" rx="0.377575" fill="white"/>
                <rect x="9.48065" y="3.0119" width="3.46594" height="10.4366" rx="0.377575" stroke="black" strokeWidth="0.406619"/>
                <rect x="9.48065" y="16.76" width="3.07869" height="3.04771" rx="1.52385" fill="white"/>
                <rect x="9.48065" y="16.76" width="3.07869" height="3.04771" rx="1.52385" stroke="black" strokeWidth="0.406619"/>
                <defs>
                  <clipPath id="clip0_652_1623">
                    <rect width="7.93285" height="21.1157" rx="0.580884" transform="matrix(-0.990725 0.13588 0.142543 0.989789 22.8594 0)" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </div>
            <p className="font-['Inter'] font-normal leading-[normal] text-[14px] text-black whitespace-pre">
              {`  ${projectName} /  ${conversation.title || 'New Thread'}`}
            </p>
            <div className="flex items-center pb-[2px] pl-[5px] pt-[5px]">
              <ChevronDown className="size-[14px] text-black" />
            </div>
          </Link>
        </div>
        <div className="flex-1 overflow-hidden p-[5px]">
          <div className="bg-white h-full w-full rounded-[20px] overflow-hidden flex flex-col shadow-sm">
            {chatComponent}
          </div>
        </div>
      </div>
    );
  }

  return chatComponent;
}
