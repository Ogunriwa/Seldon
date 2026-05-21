'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderOpen,
  MessageSquare,
  Pencil,
  Trash2,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Project = {
  id: string;
  name: string;
  instructions: string;
  createdAt: Date;
  updatedAt: Date;
};

type Conversation = {
  id: string;
  title: string;
  model: string;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function ProjectDetail({
  project: initialProject,
  conversations: initialConversations,
}: {
  project: Project;
  conversations: Conversation[];
}) {
  const [project, setProject] = useState(initialProject);
  const [conversations, setConversations] = useState(initialConversations);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editInstructions, setEditInstructions] = useState(project.instructions);
  const router = useRouter();

  const handleSave = async () => {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName.trim() || project.name,
        instructions: editInstructions,
      }),
    });
    if (res.ok) {
      setProject((p) => ({
        ...p,
        name: editName.trim() || p.name,
        instructions: editInstructions,
      }));
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
    router.push('/projects');
  };

  const handleNewChat = () => {
    window.dispatchEvent(
      new CustomEvent('project-changed', { detail: project.id }),
    );
    router.push('/');
  };

  return (
    <div className="flex h-full flex-col px-8 py-8">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/projects')}
            className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Projects
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
              {editing ? (
                <input
                  className="rounded border border-border bg-background px-2 py-1 text-xl font-semibold"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
              ) : (
                <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <Button size="sm" onClick={handleSave}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setEditing(false);
                    setEditName(project.name);
                    setEditInstructions(project.instructions);
                  }}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={handleNewChat}>
                    <Plus className="h-3.5 w-3.5" />
                    New chat
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        {editing ? (
          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Custom instructions
            </label>
            <textarea
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={editInstructions}
              onChange={(e) => setEditInstructions(e.target.value)}
              placeholder="Custom instructions for this project…"
              rows={4}
            />
          </div>
        ) : project.instructions ? (
          <div className="mb-6 rounded-md border border-border bg-muted/40 px-4 py-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Instructions</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{project.instructions}</p>
          </div>
        ) : null}

        {/* Conversations */}
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Conversations ({conversations.length})
          </h2>
          {conversations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No conversations in this project yet.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/c/${c.id}`)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 truncate">
                    <span className="text-sm text-foreground">{c.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{c.model}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
