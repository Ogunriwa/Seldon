'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Project = {
  id: string;
  name: string;
  instructions: string;
  createdAt: Date;
  updatedAt: Date;
};

export function ProjectList({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const router = useRouter();

  const fetchProjects = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data.projects);
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    const data = await res.json();
    if (res.ok) {
      setCreating(false);
      setNewName('');
      router.push(`/projects/${data.id}`);
    }
  };

  return (
    <div className="flex h-full flex-col px-8 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <Button
            onClick={() => setCreating(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>

        {creating && (
          <form
            className="mb-6 flex items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <input
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setCreating(false);
                  setNewName('');
                }
              }}
            />
            <Button type="submit" size="sm">Create</Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => { setCreating(false); setNewName(''); }}
            >
              Cancel
            </Button>
          </form>
        )}

        {projects.length === 0 && !creating ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <FolderOpen className="mb-4 h-12 w-12 opacity-40" />
            <p className="text-lg">No projects yet</p>
            <p className="mt-1 text-sm">Create a project to organize your conversations with custom instructions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/projects/${p.id}`)}
                className="flex flex-col items-start rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50"
              >
                <div className="mb-2 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{p.name}</span>
                </div>
                {p.instructions && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {p.instructions}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
