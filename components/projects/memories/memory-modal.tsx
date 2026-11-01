'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type MemoryItem = {
  id: string;
  projectId: string;
  content: string;
  isPinned: boolean;
  source: 'manual' | 'extracted';
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export function MemoryModal({
  isOpen,
  onClose,
  projectId,
  memory,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  memory?: MemoryItem | null;
  onSaved: (memory: MemoryItem) => void;
}) {
  // ── State ──────────────────────────────────────────
  // Local state for the memory snippet content and whether it is pinned.
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);

  // ── Effects ──────────────────────────────────────────
  // Loads existing memory state for editing or resets when creating.
  useEffect(() => {
    if (memory) {
      setContent(memory.content);
      setIsPinned(memory.isPinned);
    } else {
      setContent('');
      setIsPinned(false);
    }
  }, [memory, isOpen]);

  // ── Handlers ──────────────────────────────────────────

  /*
   * Memory Save Flow:
   * Posts to create or patches to update a memory associated with a project.
   */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setLimitError(null);
    try {
      if (memory?.id) {
        // → PATCH /api/projects/[id]/memories/[memoryId] — handled by app/api/projects/[id]/memories/[memoryId]/route.ts
        const res = await fetch(`/api/projects/${projectId}/memories/${memory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim(), isPinned }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to save memory');
        onSaved({ ...memory, content: content.trim(), isPinned });
        onClose();
      } else {
        // → POST /api/projects/[id]/memories — handled by app/api/projects/[id]/memories/route.ts
        const res = await fetch(`/api/projects/${projectId}/memories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content.trim(),
            isPinned,
            source: 'manual',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to save memory');
        onSaved(data);
        onClose();
      }
    } catch (err) {
      setLimitError(err instanceof Error ? err.message : 'Failed to save memory');
      console.error('Failed to save memory:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl rounded-2xl p-6 sm:p-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold tracking-tight">
            {memory ? 'Edit Memory' : 'Add Memory'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Pin a key fact, decision, or constraint for Seldon to remember across all conversations.
          </p>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Memory Fact / Note
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. Uses PyTorch with CUDA 12.0 for all model training pipelines..."
              className="w-full resize-none rounded-xl border border-border/80 bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pinToggle"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="h-4 w-4 rounded accent-foreground cursor-pointer"
            />
            <label
              htmlFor="pinToggle"
              className="text-xs font-medium text-foreground cursor-pointer select-none"
            >
              Pin to top priority context
            </label>
          </div>

          {limitError && (
            <p className="text-[13px] font-medium text-red-500 max-w-[500px]">
              {limitError}
            </p>
          )}

          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="flex h-10 items-center justify-center rounded-xl bg-foreground px-6 text-xs font-semibold text-background shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Memory'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
