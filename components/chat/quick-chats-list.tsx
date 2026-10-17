'use client';

// ── Imports ──────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MessageSquare, Trash2, Clock } from 'lucide-react';
import { useTabs } from '@/lib/tabs-context';

export type QuickChatItem = {
  id: string;
  title: string;
  model: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export function QuickChatsList({
  initialChats,
}: {
  initialChats: QuickChatItem[];
}) {
  // ── State & Context ────────────────────────────────────────────────
  // `chats` stores the list locally for optimistic deletion.
  // `useTabs` integrates this with the global layout's tab bar.
  const [chats, setChats] = useState<QuickChatItem[]>(initialChats);
  const router = useRouter();
  const { openTab } = useTabs();

  // ── Event Handlers ─────────────────────────────────────────────────
  const handleOpenChat = (chat: QuickChatItem) => {
    openTab({
      id: `/c/${chat.id}`,
      title: chat.title,
      href: `/c/${chat.id}`,
    });
    router.push(`/c/${chat.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    try {
      await fetch(`/api/conversations/${chatId}`, {
        method: 'DELETE',
      });
      // Tell the SideNav Quick Chats accordion to re-fetch
      window.dispatchEvent(new CustomEvent('conversations-changed'));
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  // ── JSX Return ─────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full flex-col overflow-y-auto px-8 py-8 lg:px-14">
      <div className="mx-auto w-full max-w-4xl">
        {/* Top Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Chats
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              History of direct quick chats started from your Home Screen
            </p>
          </div>

          <button
            onClick={() => router.push('/')}
            className="flex h-9 items-center gap-2 rounded-xl bg-foreground px-4 text-xs font-semibold text-background shadow-xs transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        {/* Chats List */}
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 py-24 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <h3 className="text-base font-semibold text-foreground">No quick chats yet</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Type any thought or prompt into the composer on the Home Screen to start a chat.
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3.5 text-xs font-semibold text-background"
            >
              <Plus className="h-3.5 w-3.5" />
              Start a Chat
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleOpenChat(chat)}
                className="group flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3.5 text-sm shadow-2xs transition-all hover:border-border hover:bg-muted/20 cursor-pointer"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <h4 className="font-semibold text-foreground text-xs truncate">
                      {chat.title}
                    </h4>
                    <span className="text-[10px] text-muted-foreground">
                      {chat.model}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(chat.updatedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, chat.id)}
                    className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                    title="Delete Chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
