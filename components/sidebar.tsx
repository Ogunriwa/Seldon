'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Plus,
  MessageSquare,
  Pencil,
  Trash2,
  Check,
  X,
  FolderOpen,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Project = {
  id: string;
  name: string;
  instructions: string;
};

type Conversation = {
  id: string;
  title: string;
  model: string;
  projectId: string | null;
};

export function Sidebar() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingConvoId, setEditingConvoId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectInstructions, setEditProjectInstructions] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  const fetchProjects = () => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => setProjects(data.projects))
      .catch((e) => console.error('failed to fetch projects', e));
  };

  const fetchConversations = () => {
    const url = selectedProjectId
      ? `/api/conversations?projectId=${selectedProjectId}`
      : '/api/conversations';
    fetch(url)
      .then((r) => r.json())
      .then((data) => setConversations(data.conversations))
      .catch((e) => console.error('failed to fetch conversations', e));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [pathname, selectedProjectId]);

  useEffect(() => {
    const handler = () => fetchConversations();
    window.addEventListener('conversation-created', handler);
    return () => window.removeEventListener('conversation-created', handler);
  }, [selectedProjectId]);

  // Expose selected project for the Chat component
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('project-changed', { detail: selectedProjectId }),
    );
  }, [selectedProjectId]);

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

  const handleCreateProject = async () => {
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    const data = await res.json();
    setCreatingProject(false);
    setNewProjectName('');
    fetchProjects();
    setSelectedProjectId(data.id);
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;
    await fetch(`/api/projects/${editingProject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editProjectName.trim() || editingProject.name,
        instructions: editProjectInstructions,
      }),
    });
    setEditingProject(null);
    fetchProjects();
  };

  const handleDeleteProject = async (id: string) => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (selectedProjectId === id) setSelectedProjectId(null);
    fetchProjects();
    fetchConversations();
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-semibold">Seldon</span>
      </div>

      {/* Project picker */}
      <div className="border-b border-border px-2 py-2">
        <div className="flex items-center gap-1">
          <select
            className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
            value={selectedProjectId ?? ''}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
          >
            <option value="">All Conversations</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setCreatingProject(true)}
            title="New project"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {selectedProject && (
            <button
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => {
                setEditingProject(selectedProject);
                setEditProjectName(selectedProject.name);
                setEditProjectInstructions(selectedProject.instructions);
              }}
              title="Project settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {creatingProject && (
          <form
            className="mt-2 flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateProject();
            }}
          >
            <input
              className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setCreatingProject(false);
                  setNewProjectName('');
                }
              }}
            />
            <button type="submit" className="p-0.5 text-muted-foreground hover:text-foreground">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setCreatingProject(false);
                setNewProjectName('');
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* Project settings panel */}
      {editingProject && (
        <div className="border-b border-border px-3 py-3">
          <div className="mb-2 text-xs font-medium text-foreground">Project Settings</div>
          <input
            className="mb-2 w-full rounded border border-border bg-background px-2 py-1 text-xs"
            value={editProjectName}
            onChange={(e) => setEditProjectName(e.target.value)}
            placeholder="Project name"
          />
          <textarea
            className="mb-2 w-full rounded border border-border bg-background px-2 py-1 text-xs"
            value={editProjectInstructions}
            onChange={(e) => setEditProjectInstructions(e.target.value)}
            placeholder="Custom instructions for this project…"
            rows={4}
          />
          <div className="flex items-center gap-1">
            <Button size="sm" className="h-6 text-xs" onClick={handleUpdateProject}>
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              onClick={() => setEditingProject(null)}
            >
              Cancel
            </Button>
            <button
              className="ml-auto p-0.5 text-muted-foreground hover:text-destructive"
              onClick={() => handleDeleteProject(editingProject.id)}
              title="Delete project"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

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
            {editingConvoId === c.id ? (
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
                  <span className="truncate">{c.title}</span>
                </button>
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
              </>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
