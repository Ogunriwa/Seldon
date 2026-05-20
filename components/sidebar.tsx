'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, MessageSquare, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Conversation = {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
};

export function Sidebar() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  const fetchConversations = () => {
    fetch('/api/conversations')
      .then((r) => r.json())
      .then((data) => setConversations(data.conversations))
      .catch((e) => console.error('failed to fetch conversations', e));
  };

  useEffect(() => {
    fetchConversations();
  }, [pathname]);

  useEffect(() => {
    const handler = () => fetchConversations();
    window.addEventListener('conversation-created', handler);
    return () => window.removeEventListener('conversation-created', handler);
  }, []);

  const activeId = pathname.startsWith('/c/') ? pathname.split('/')[2] : null;

  const handleRename = async (id: string) => {
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    try {
      await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      setEditingId(null);
      fetchConversations();
    } catch (e) {
      console.error('failed to rename', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      fetchConversations();
      if (activeId === id) router.push('/');
    } catch (e) {
      console.error('failed to delete', e);
    }
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-semibold">Seldon</span>
      </div>
      <div className="p-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => router.push('/')}
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${
              activeId === c.id
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            }`}
          >
            {editingId === c.id ? (
              <form
                className="flex flex-1 items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRename(c.id);
                }}
              >
                <input
                  className="flex-1 rounded border border-border bg-background px-1 py-0.5 text-sm"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
                <button type="submit" className="p-0.5 hover:text-foreground">
                  <Check className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="p-0.5 hover:text-foreground"
                  onClick={() => setEditingId(null)}
                >
                  <X className="h-3 w-3" />
                </button>
              </form>
            ) : (
              <>
                <button
                  className="flex flex-1 items-center gap-2 truncate text-left"
                  onClick={() => router.push(`/c/${c.id}`)}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{c.title}</span>
                </button>
                <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                  <button
                    className="p-0.5 hover:text-foreground"
                    onClick={() => {
                      setEditingId(c.id);
                      setEditTitle(c.title);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    className="p-0.5 hover:text-destructive"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
