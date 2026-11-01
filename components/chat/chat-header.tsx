'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { useTabs } from '@/lib/tabs-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export type ChatHeaderProps = {
  conversationId: string;
  initialTitle: string;
  projectId?: string | null;
  projectName?: string | null;
};

export function ChatHeader({
  conversationId,
  initialTitle,
  projectId,
  projectName,
}: ChatHeaderProps) {
  const [title, setTitle] = useState(initialTitle || 'New chat');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const menuContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditingRef = useRef(false);
  isEditingRef.current = isEditing;

  const router = useRouter();
  const { renameTab, closeTab } = useTabs();
  const tabHref = `/c/${conversationId}`;

  // Sync initial and updated title into the global workspace tab bar (fixes generic "Chat" tab after page reload)
  useEffect(() => {
    renameTab(tabHref, title);
  }, [tabHref, title, renameTab]);

  // Listen for background LLM-generated title updates dispatched by components/chat.tsx after the first reply
  useEffect(() => {
    const handleTitleUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; title: string }>).detail;
      if (detail && detail.id === conversationId && detail.title && !isEditingRef.current) {
        setTitle(detail.title);
        setDraftTitle(detail.title);
        renameTab(tabHref, detail.title);
      }
    };
    window.addEventListener('conversation-title-updated', handleTitleUpdated);
    return () => window.removeEventListener('conversation-title-updated', handleTitleUpdated);
  }, [conversationId, tabHref, renameTab]);

  // Close dropdown menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  // Auto-focus and select all text when entering inline rename mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startRename = useCallback(() => {
    setIsMenuOpen(false);
    setDraftTitle(title);
    setIsEditing(true);
  }, [title]);

  const cancelRename = useCallback(() => {
    setIsEditing(false);
    setDraftTitle(title);
  }, [title]);

  const commitRename = useCallback(async () => {
    if (!isEditingRef.current) return;
    setIsEditing(false);

    const trimmed = draftTitle.trim();
    if (!trimmed || trimmed === title) {
      setDraftTitle(title);
      return;
    }

    const previousTitle = title;
    setTitle(trimmed);
    setDraftTitle(trimmed);
    renameTab(tabHref, trimmed);

    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      window.dispatchEvent(new CustomEvent('conversations-changed'));
    } catch (err) {
      console.error('Failed to rename conversation:', err);
      setTitle(previousTitle);
      setDraftTitle(previousTitle);
      renameTab(tabHref, previousTitle);
    }
  }, [conversationId, draftTitle, renameTab, tabHref, title]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  };

  const handleConfirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setIsDeleteConfirmOpen(false);
      window.dispatchEvent(new CustomEvent('conversations-changed'));
      closeTab(tabHref);
      router.push(projectId ? `/projects/${projectId}` : '/');
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      setIsDeleting(false);
    }
  };

  return (
    <header className="flex items-center px-[16px] py-[14px] w-full shrink-0 select-none">
      <div className="flex items-center gap-[6px] min-w-0">
        {projectId && (
          <div className="flex items-center gap-[6px] shrink-0">
            <Link
              href={`/projects/${projectId}`}
              className="flex items-center gap-[8px] hover:opacity-80 transition-opacity"
            >
              <ProjectBindersIcon />
              <span className="font-normal text-[14px] text-black dark:text-white whitespace-nowrap">
                {projectName || 'Project'}
              </span>
            </Link>
            <span className="text-[14px] text-neutral-400 px-[2px]">/</span>
          </div>
        )}

        {/* Interactive Title + Chevron Menu Container */}
        <div ref={menuContainerRef} className="relative flex items-center min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={commitRename}
              maxLength={200}
              aria-label="Rename chat title"
              className="w-[280px] sm:w-[360px] max-w-full rounded-[6px] border border-[#2563EB] bg-white dark:bg-neutral-900 px-[8px] py-[3px] text-[14px] font-medium text-[#111827] dark:text-white outline-none ring-2 ring-[#2563EB]/20"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              title={title}
              className="group flex items-center gap-[6px] rounded-[8px] px-[8px] py-[4px] text-left hover:bg-[#F3F4F6] dark:hover:bg-neutral-800 transition-colors cursor-pointer max-w-[360px] sm:max-w-[480px]"
            >
              <span className="truncate text-[14px] font-medium text-[#111827] dark:text-neutral-100">
                {title}
              </span>
              <ChevronDown
                className={`size-[14px] shrink-0 text-neutral-500 group-hover:text-[#111827] dark:group-hover:text-white transition-transform duration-150 ${
                  isMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}

          {/* Dropdown Menu */}
          {isMenuOpen && !isEditing && (
            <div
              role="menu"
              className="absolute left-0 top-full mt-[6px] z-50 w-[180px] rounded-[12px] border border-[rgba(0,0,0,0.08)] dark:border-neutral-800 bg-white dark:bg-neutral-900 p-[4px] shadow-[0px_8px_24px_rgba(0,0,0,0.12)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={startRename}
                className="flex w-full items-center gap-[10px] rounded-[8px] px-[10px] py-[8px] text-left text-[13px] font-medium text-[#111827] dark:text-neutral-100 hover:bg-[#F3F4F6] dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <Pencil className="size-[14px] text-neutral-500" />
                <span>Rename</span>
              </button>

              <div className="my-[4px] h-[1px] w-full bg-[rgba(0,0,0,0.06)] dark:bg-neutral-800" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsDeleteConfirmOpen(true);
                }}
                className="flex w-full items-center gap-[10px] rounded-[8px] px-[10px] py-[8px] text-left text-[13px] font-medium text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <Trash2 className="size-[14px] text-[#DC2626]" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6 sm:p-7">
          <DialogHeader className="flex flex-col gap-1.5 text-left">
            <DialogTitle className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Delete chat?
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-neutral-500">
              This will permanently delete <span className="font-medium text-neutral-700 dark:text-neutral-300">&ldquo;{title}&rdquo;</span> and all of its messages.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="rounded-xl bg-[#DC2626] px-4 py-2 text-xs font-medium text-white hover:bg-red-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}

function ProjectBindersIcon() {
  return (
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
  );
}
