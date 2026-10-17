'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderUp, UploadCloud } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useTabs } from '@/lib/tabs-context';

export function StartProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (project: any) => void;
}) {
  // ── State & Refs ──────────────────────────────────────────
  // Local state for project metadata, file attachments, and submission status.
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [hasLocation, setHasLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ── Hooks ──────────────────────────────────────────
  const router = useRouter();
  const { openTab } = useTabs();

  /*
   * Project Creation Flow:
   * 1. Validates project name.
   * 2. POST to /api/projects to create the new project.
   * 3. If files are attached, loop and POST to /api/projects/[id]/libraries.
   * 4. Open the new project in a new workspace tab and navigate to it.
   */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // → POST /api/projects — handled by app/api/projects/route.ts
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim(),
          emoji: '📓',
          instructions: instructions.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.id) {
        // If files were selected, upload them to this project's library
        if (files.length > 0) {
          for (const f of files) {
            const formData = new FormData();
            formData.append('file', f);
            formData.append('type', 'reference');
            // → POST /api/projects/[id]/libraries — handled by app/api/projects/[id]/libraries/route.ts
            await fetch(`/api/projects/${data.id}/libraries`, {
              method: 'POST',
              body: formData,
            });
          }
        }

        onClose();
        setName('');
        setDescription('');
        setInstructions('');
        setFiles([]);

        if (onProjectCreated) {
          onProjectCreated(data);
        }

        openTab({
          id: `/projects/${data.id}`,
          title: data.name,
          href: `/projects/${data.id}`,
        });
        router.push(`/projects/${data.id}`);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── File Selection ──────────────────────────────────────────
  // Updates the state array when user selects files via the hidden input.
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl rounded-2xl p-6 sm:p-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold tracking-tight">
            Start a project
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreate} className="flex flex-col gap-5">
          {/* Project Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Machine Learning"
              className="h-11 w-full rounded-xl border border-border/80 bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring"
            />
          </div>

          {/* Project Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this project accomplishes..."
              className="w-full resize-none rounded-xl border border-border/80 bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring"
            />
          </div>

          {/* Instructions */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Instructions
            </label>
            <textarea
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Project-level rules inherited by all agents and threads..."
              className="w-full resize-none rounded-xl border border-border/80 bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring"
            />
          </div>

          {/* Add Files */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Add Files
            </label>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-background text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              {files.length > 0
                ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
                : 'Attach files here'}
            </button>
          </div>

          {/* Choose Project Location (Paused) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Choose Project Location
              </label>
              <Switch
                checked={hasLocation}
                onCheckedChange={(c) => setHasLocation(c)}
              />
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                disabled={!hasLocation}
                placeholder="Select a folder..."
                className="h-11 w-full rounded-xl border border-border/80 bg-background pr-10 pl-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
              />
              <FolderUp className="pointer-events-none absolute right-3.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Submit Action (Figma Node 722:2316) */}
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="inline-flex items-center justify-center gap-[8px] rounded-[8px] bg-[#111827] dark:bg-neutral-100 px-[16px] py-[10px] text-[14px] font-medium text-white dark:text-neutral-900 transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50 cursor-pointer select-none shadow-xs"
            >
              <Plus className="h-4 w-4 stroke-[2]" />
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
