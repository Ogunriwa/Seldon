'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Plus,
  MessageSquare,
  FolderOpen,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';

type Conversation = {
  id: string;
  title: string;
  model: string;
  projectId: string | null;
};

export function Sidebar() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [editingConvoId, setEditingConvoId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [expanded, setExpanded] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout>>(null);
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

  const handleRenameConvo = async (id: string) => {
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    });
    setEditingConvoId(null);
    fetchConversations();
  };

  const handleDeleteConvo = async (id: string) => {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    fetchConversations();
    if (activeId === id) router.push('/');
  };

  const onMouseEnter = () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    setExpanded(true);
  };

  const onMouseLeave = () => {
    collapseTimer.current = setTimeout(() => setExpanded(false), 200);
  };

  const recentConversations = conversations.slice(0, 15);

  return (
    <aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`flex shrink-0 flex-col border-r border-border bg-muted/30 transition-[width] duration-200 ease-in-out overflow-hidden ${
        expanded ? 'w-64' : 'w-14'
      }`}
    >
      {/* Logo */}
      <div className="flex h-12 items-center border-b border-border px-4">
        <span className={`text-sm font-semibold whitespace-nowrap transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
          Seldon
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-2 py-2">
        <SidebarNavItem
          icon={<Plus className="h-4 w-4" />}
          label="New chat"
          expanded={expanded}
          active={pathname === '/'}
          onClick={() => router.push('/')}
        />
        <SidebarNavItem
          icon={<FolderOpen className="h-4 w-4" />}
          label="Projects"
          expanded={expanded}
          active={pathname.startsWith('/projects')}
          onClick={() => router.push('/projects')}
        />
      </nav>

      <div className="mx-2 border-t border-border" />

      {/* Recents */}
      <div className="flex flex-col flex-1 overflow-hidden px-2 py-2">
        <span className={`mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
          Recents
        </span>

        <div className="flex-1 overflow-y-auto">
          {recentConversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                activeId === c.id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              {editingConvoId === c.id && expanded ? (
                <form
                  className="flex flex-1 items-center gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRenameConvo(c.id);
                  }}
                >
                  <input
                    className="flex-1 rounded border border-border bg-background px-1 py-0.5 text-sm"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEditingConvoId(null);
                    }}
                  />
                  <button type="submit" className="p-0.5 hover:text-foreground">
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="p-0.5 hover:text-foreground"
                    onClick={() => setEditingConvoId(null)}
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
                    {expanded && <span className="truncate">{c.title}</span>}
                  </button>
                  {expanded && (
                    <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                      <button
                        className="p-0.5 hover:text-foreground"
                        onClick={() => {
                          setEditingConvoId(c.id);
                          setEditTitle(c.title);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        className="p-0.5 hover:text-destructive"
                        onClick={() => handleDeleteConvo(c.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function SidebarNavItem({
  icon,
  label,
  expanded,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  expanded: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={expanded ? undefined : label}
      className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm whitespace-nowrap transition-colors ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      }`}
    >
      {icon}
      <span className={`transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0'}`}>
        {label}
      </span>
    </button>
  );
}
