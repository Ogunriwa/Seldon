'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { MemoryItem } from "../memories/memory-modal";
import { estimatePinnedTokens, pinnedMemoryLimit } from "@/lib/chat/limits";

// --- Custom Icons from Figma ---
const PinIcon = ({ active, onClick }: { active: boolean; onClick?: () => void }) => (
  <svg
    onClick={onClick}
    className={`cursor-pointer transition-colors ${active ? 'text-[#111827] dark:text-white' : 'text-[#9ca3af] hover:text-[#111827] dark:hover:text-white'}`}
    width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M15.6391 5.02788L10.971 0.360555C10.8567 0.246247 10.721 0.155571 10.5717 0.0937063C10.4223 0.0318416 10.2623 0 10.1006 0C9.93901 0 9.77896 0.0318416 9.62963 0.0937063C9.48029 0.155571 9.34461 0.246247 9.23033 0.360555L5.10527 4.49869C4.28533 4.24179 2.41317 3.93181 0.459479 5.50938C0.324817 5.61767 0.214467 5.75309 0.135612 5.90685C0.0567581 6.06061 0.011167 6.22925 0.0018069 6.40179C-0.00755316 6.57434 0.0195276 6.74692 0.0812864 6.9083C0.143045 7.06969 0.238098 7.21626 0.360256 7.33847L4.07689 11.0536L0.795607 14.3325C0.680145 14.448 0.615279 14.6046 0.615279 14.7679C0.615279 14.9312 0.680145 15.0878 0.795607 15.2032C0.911069 15.3187 1.06767 15.3836 1.23096 15.3836C1.39425 15.3836 1.55085 15.3187 1.66631 15.2032L4.94528 11.922L8.65961 15.6363C8.77379 15.751 8.90947 15.842 9.05888 15.9041C9.20829 15.9663 9.36848 15.9984 9.53031 15.9986C9.55954 15.9986 9.588 15.9986 9.61722 15.9986C9.79266 15.9864 9.96342 15.9366 10.1179 15.8526C10.2724 15.7686 10.407 15.6523 10.5125 15.5117C12.0232 13.5041 11.8778 11.872 11.5271 10.8967L15.6398 6.76852C15.7541 6.65418 15.8447 6.51846 15.9065 6.3691C15.9683 6.21975 16.0001 6.05968 16 5.89804C15.9999 5.7364 15.968 5.57636 15.9061 5.42706C15.8442 5.27775 15.7534 5.14211 15.6391 5.02788ZM14.7684 5.89858L10.3633 10.3182C10.2723 10.4096 10.2123 10.5271 10.1918 10.6544C10.1712 10.7816 10.1911 10.9121 10.2487 11.0274C10.9763 12.4835 10.1103 13.9956 9.53031 14.7671L1.23096 6.467C2.16012 5.71783 3.04928 5.52015 3.72922 5.52015C4.16067 5.51426 4.58856 5.5989 4.98528 5.76859C5.10102 5.82652 5.23208 5.84647 5.35981 5.82562C5.48754 5.80477 5.60545 5.74417 5.69676 5.65245L10.101 1.23049L14.7684 5.89781V5.89858Z" fill="currentColor"/>
  </svg>
);

const PencilIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.41744 2.74997L12.0843 5.41659M13.5338 3.9582C13.8863 3.60582 14.0843 3.12786 14.0844 2.62946C14.0845 2.13106 13.8865 1.65304 13.5341 1.30058C13.1817 0.948111 12.7037 0.750063 12.2052 0.75C11.7068 0.749938 11.2287 0.947866 10.8762 1.30024L1.97807 10.1994C1.82326 10.3538 1.70878 10.5438 1.6447 10.7527L0.763958 13.654C0.746726 13.7117 0.745425 13.7729 0.760191 13.8313C0.774958 13.8896 0.805241 13.9428 0.847829 13.9854C0.890417 14.0279 0.943721 14.0581 1.00208 14.0727C1.06045 14.0874 1.1217 14.086 1.17933 14.0687L4.08159 13.1887C4.29039 13.1252 4.4804 13.0114 4.63497 12.8574L13.5338 3.9582Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const XIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.75 0.75L0.75 8.75M0.75 0.75L8.75 8.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export function MemoriesTab({
  projectId,
  initialMemories,
}: {
  projectId: string;
  initialMemories: MemoryItem[];
}) {
  const [memories, setMemories] = useState<MemoryItem[]>(initialMemories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch fresh data on mount to ensure we don't show stale initialMemories
  useEffect(() => {
    fetch(`/api/projects/${projectId}/memories`)
      .then((res) => res.json())
      .then((data) => {
        if (data.memories) setMemories(data.memories);
      })
      .catch((err) => console.error('Failed to refresh memories:', err));
  }, [projectId]);

  // ── Handlers ──────────────────────────────────────────

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingId(null);
    setDraftContent('');
  };

  const handleEdit = (m: MemoryItem) => {
    setIsCreating(false);
    setEditingId(m.id);
    setDraftContent(m.content);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setDraftContent('');
  };

  const handleSave = async (memoryId?: string) => {
    if (!draftContent.trim()) return;
    setIsSaving(true);
    setLimitError(null);
    try {
      if (isCreating) {
        // Create new memory
        const res = await fetch(`/api/projects/${projectId}/memories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: draftContent, isPinned: true, source: 'manual' }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to save memory');
        const newMem = await res.json();
        // Validate the response has required fields before adding to state
        if (newMem?.id && newMem?.content) {
          setMemories((prev) => [newMem, ...prev]);
        }
      } else if (memoryId) {
        // Optimistic update — mutate local state immediately
        setMemories((prev) =>
          prev.map((m) => (m.id === memoryId ? { ...m, content: draftContent } : m))
        );
        
        // Fire PATCH in the background (response is { ok: true }, not the full object)
        const res = await fetch(`/api/projects/${projectId}/memories/${memoryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: draftContent }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to save memory');
      }
      setIsCreating(false);
      setEditingId(null);
      setDraftContent('');
    } catch (err) {
      if (!isCreating && memoryId) {
        // Revert optimistic update
        const original = memories.find((m) => m.id === memoryId);
        if (original) {
          setMemories((prev) => prev.map((m) => (m.id === memoryId ? { ...m, content: original.content } : m)));
        }
      }
      setLimitError(err instanceof Error ? err.message : 'Failed to save memory');
      console.error('Failed to save memory:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePin = async (m: MemoryItem) => {
    if (!m.id) return; // guard against corrupted memory objects
    const newPinned = !m.isPinned;
    setLimitError(null);
    // Optimistic update
    setMemories((prev) => prev.map((mem) => (mem.id === m.id ? { ...mem, isPinned: newPinned } : mem)));
    try {
      const res = await fetch(`/api/projects/${projectId}/memories/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: newPinned }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to toggle pin');
    } catch (err) {
      // Revert on error
      setMemories((prev) => prev.map((mem) => (mem.id === m.id ? { ...mem, isPinned: !newPinned } : mem)));
      setLimitError(err instanceof Error ? err.message : 'Failed to toggle pin');
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleDelete = async (memoryId: string) => {
    if (!memoryId) return;
    // Optimistic update
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    try {
      await fetch(`/api/projects/${projectId}/memories/${memoryId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  // ── Derived State ─────────────────────────────────────
  // Use the same formula as the server
  const pinnedMemories = memories.filter((m) => m.isPinned);
  let predictedContents = pinnedMemories.map((m) => m.content ?? '');
  
  if (isCreating && draftContent.trim()) {
    predictedContents.push(draftContent.trim());
  } else if (editingId && draftContent.trim()) {
    const original = pinnedMemories.find(m => m.id === editingId);
    if (original) {
      predictedContents = predictedContents.filter(c => c !== original.content);
      predictedContents.push(draftContent.trim());
    }
  }

  const tokenCount = estimatePinnedTokens(predictedContents);
  const tokenLimit = pinnedMemoryLimit();
  const isOverLimit = tokenCount > tokenLimit;
  const tokenDisplay = tokenCount > 1000 ? `${(tokenCount / 1000).toFixed(1)}K` : tokenCount;
  const limitDisplay = `${Math.round(tokenLimit / 1000)}K`;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-[17px] flex flex-col items-start relative size-full">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 flex items-center justify-between pb-[20px] pt-[40px] px-[24px] w-full shrink-0 rounded-t-[17px]">
        <div className="flex flex-col gap-[6px] items-start shrink-0">
          <p className="font-['Inter'] font-bold text-[#111827] dark:text-white text-[20px] m-0">
            Project Memories
          </p>
          <p className="hidden xl:block font-['Inter'] font-normal text-[#4b5563] dark:text-neutral-400 text-[14px] m-0">
            Pin core facts and decisions that agents should remember across all threads.
          </p>
          {limitError && (
            <p className="font-['Inter'] font-medium text-red-500 text-[13px] m-0 max-w-[500px]">
              {limitError}
            </p>
          )}
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-[#111827] dark:bg-white flex gap-[8px] items-center justify-center px-[16px] py-[10px] rounded-[8px] shrink-0 hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4 text-white dark:text-black" />
          <span className="font-['Inter'] font-medium text-[14px] text-white dark:text-black whitespace-nowrap">
            Add Memory
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-[16px] xl:gap-[12px] items-start pb-[40px] pt-[12px] px-[24px] w-full shrink-0 flex-1">
        
        {/* Creation Card */}
        {isCreating && (
          <div className="w-full flex-shrink-0">
            <div className="rounded-[12px] p-[0.75px] bg-gradient-to-br from-[#EE6055] to-[#57C4E5] w-full flex flex-col drop-shadow-[0px_4px_4px_rgba(0,0,0,0.04)]">
              <div className="bg-white dark:bg-neutral-900 rounded-[11.25px] flex flex-col gap-[16px] items-start p-[20px] w-full">
                <div className="flex items-start w-full">
                  <textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    placeholder="Record a project fact or decision..."
                    className="flex-[1_0_0] font-['Inter'] font-normal leading-[1.5] text-[#111827] dark:text-neutral-100 text-[14px] bg-transparent outline-none resize-none min-h-[60px]"
                    autoFocus
                  />
                </div>
                <div className="flex gap-[8px] items-center justify-end w-full shrink-0">
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="bg-white dark:bg-neutral-900 border border-[#e5e7eb] dark:border-neutral-700 flex items-center justify-center px-[14px] py-[8px] rounded-[6px] hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  >
                    <span className="font-['Inter'] font-medium text-[#4b5563] dark:text-neutral-300 text-[13px] whitespace-nowrap">
                      Cancel
                    </span>
                  </button>
                  <button
                    onClick={() => handleSave()}
                    disabled={isSaving || isOverLimit}
                    className="bg-[#111827] dark:bg-white flex items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:opacity-90 transition-opacity disabled:opacity-50 min-w-[70px]"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white dark:text-black" />
                    ) : (
                      <span className="font-['Inter'] font-medium text-white dark:text-black text-[13px] whitespace-nowrap">
                        Save
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {memories.length === 0 && !isCreating ? (
          <div className="flex flex-[1_0_0] flex-col items-center justify-center min-h-[400px] px-[24px] py-[80px] w-full">
            <div className="flex flex-col gap-[8px] items-center text-center w-[420px]">
              <p className="font-['Inter'] font-semibold text-[#111827] dark:text-white text-[18px]">
                No memories yet
              </p>
              <p className="font-['Inter'] font-normal leading-[1.5] text-[#4b5563] dark:text-neutral-400 text-[14px]">
                Add core facts, preferences, and design decisions here. Pinned memories are automatically injected into the agent's context.
              </p>
            </div>
          </div>
        ) : (
          /* Memory List */
          <>
            {memories.filter((m) => m.id && m.content != null).map((memory) => {
              const isEditingThis = editingId === memory.id;

              if (isEditingThis) {
                return (
                  <div key={memory.id} className="w-full flex-shrink-0">
                    <div className="rounded-[12px] p-[0.75px] bg-gradient-to-br from-[#EE6055] to-[#57C4E5] w-full flex flex-col drop-shadow-[0px_4px_4px_rgba(0,0,0,0.04)]">
                      <div className="bg-white dark:bg-neutral-900 rounded-[11.25px] flex flex-col gap-[16px] items-start p-[20px] w-full">
                        <div className="flex items-start w-full">
                          <textarea
                            value={draftContent}
                            onChange={(e) => setDraftContent(e.target.value)}
                            className="flex-[1_0_0] font-['Inter'] font-normal leading-[1.5] text-[#111827] dark:text-neutral-100 text-[14px] bg-transparent outline-none resize-none min-h-[60px]"
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-[8px] items-center justify-end w-full shrink-0">
                          <button
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="bg-white dark:bg-neutral-900 border border-[#e5e7eb] dark:border-neutral-700 flex items-center justify-center px-[14px] py-[8px] rounded-[6px] hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                          >
                            <span className="font-['Inter'] font-medium text-[#4b5563] dark:text-neutral-300 text-[13px] whitespace-nowrap">
                              Cancel
                            </span>
                          </button>
                          <button
                            onClick={() => handleSave(memory.id)}
                            disabled={isSaving || isOverLimit}
                            className="bg-[#111827] dark:bg-white flex items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:opacity-90 transition-opacity disabled:opacity-50 min-w-[70px]"
                          >
                            {isSaving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-white dark:text-black" />
                            ) : (
                              <span className="font-['Inter'] font-medium text-white dark:text-black text-[13px] whitespace-nowrap">
                                Save
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={memory.id}
                  className="group bg-white dark:bg-neutral-900 border border-[#e5e7eb] dark:border-neutral-800 border-solid drop-shadow-[0px_1px_1px_rgba(0,0,0,0.02)] flex gap-[16px] items-center p-[20px] rounded-[12px] shrink-0 w-full hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                >
                  <div className="flex flex-col items-start shrink-0 w-[16px]">
                    <div className="flex flex-col items-center justify-center p-[3px] shrink-0 w-full">
                      <PinIcon active={memory.isPinned} onClick={() => handleTogglePin(memory)} />
                    </div>
                  </div>
                  <p className="flex-[1_0_0] min-w-0 font-['Inter'] font-normal leading-[1.5] text-[#111827] dark:text-neutral-300 text-[14px] whitespace-pre-wrap break-words">
                    {memory.content}
                  </p>
                  {/* Hover Actions */}
                  <div className="flex gap-[8px] items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(memory)}
                      className="bg-[#f3f4f6] dark:bg-neutral-800 text-[#4B5563] dark:text-neutral-400 hover:text-black dark:hover:text-white flex items-center justify-center rounded-[16px] shrink-0 size-[32px] transition-colors"
                      title="Edit memory"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => handleDelete(memory.id)}
                      className="bg-[#f3f4f6] dark:bg-neutral-800 text-[#4B5563] dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center rounded-[16px] shrink-0 size-[32px] transition-colors"
                      title="Delete memory"
                    >
                      <XIcon />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Token Count */}
            {(memories.length > 0 || isCreating) && (
              <div className="flex items-center justify-end p-[10px] shrink-0 w-full mt-auto">
                <p className={`font-['Inter'] font-medium text-[14px] whitespace-nowrap transition-colors ${isOverLimit ? 'text-red-500' : 'text-[#9ca3af] dark:text-neutral-500'}`}>
                  Token Count: {tokenDisplay} / {limitDisplay}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
