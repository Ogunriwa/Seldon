'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, PanelLeft, Pencil, Trash2 } from 'lucide-react';
import { useSidebar } from '@/lib/sidebar-context';
import { useTabs } from '@/lib/tabs-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ProjectBinderIcon } from './projects-dashboard';
import { ThreadsTab, ThreadItem } from './tabs/threads-tab';
import { InstructionsTab } from './tabs/instructions-tab';
import { MemoriesTab } from './tabs/memories-tab';
import { LibraryTab } from './tabs/library-tab';

export type ProjectFullData = {
  id: string;
  name: string;
  emoji?: string;
  description: string;
  instructions: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  threads?: ThreadItem[];
  libraries?: any[];
  memories?: any[];
};

type TabType =
  | 'threads'
  | 'instructions'
  | 'libraries'
  | 'memory';

const TABS: { id: TabType; label: string }[] = [
  { id: 'threads', label: 'Threads' },
  { id: 'instructions', label: 'Instructions' },
  { id: 'libraries', label: 'Library' },
  { id: 'memory', label: 'Memory' },
];

export function ProjectWorkspace({
  project,
}: {
  project: ProjectFullData;
}) {
  const [activeTab, setActiveTab] = useState<TabType>('threads');
  const [projectName, setProjectName] = useState(project.name);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(project.name);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const menuContainerRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isEditingNameRef = useRef(false);
  isEditingNameRef.current = isEditingName;

  const router = useRouter();
  const { isOpen, toggleSidebar, handleHoverEnter, handleHoverLeave } = useSidebar();
  const { renameTab, closeTab } = useTabs();
  const tabHref = `/projects/${project.id}`;

  // Sync project title into the global workspace tab bar
  useEffect(() => {
    renameTab(tabHref, projectName);
  }, [tabHref, projectName, renameTab]);

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
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const startRename = useCallback(() => {
    setIsMenuOpen(false);
    setDraftName(projectName);
    setIsEditingName(true);
  }, [projectName]);

  const cancelRename = useCallback(() => {
    setIsEditingName(false);
    setDraftName(projectName);
  }, [projectName]);

  const commitRename = useCallback(async () => {
    if (!isEditingNameRef.current) return;
    setIsEditingName(false);

    const trimmed = draftName.trim();
    if (!trimmed || trimmed === projectName) {
      setDraftName(projectName);
      return;
    }

    const previousName = projectName;
    setProjectName(trimmed);
    setDraftName(trimmed);
    renameTab(tabHref, trimmed);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.error('Failed to rename project:', err);
      setProjectName(previousName);
      setDraftName(previousName);
      renameTab(tabHref, previousName);
    }
  }, [draftName, project.id, projectName, renameTab, tabHref]);

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setIsDeleteConfirmOpen(false);
      window.dispatchEvent(new CustomEvent('conversations-changed'));
      closeTab(tabHref);
      router.push('/projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-[10px] xl:gap-0 items-start" data-node-id="687:1529">
      {/* 1. Breadcrumbs Routing Header + Inline Sidebar Trigger when Closed (Figma Nodes 859:3640 / 658:5956) */}
      <div
        className={`flex w-full shrink-0 ${
          !isOpen ? 'items-end gap-[10px] px-[12px]' : 'items-center'
        }`}
        data-node-id="859:3640"
      >
        {!isOpen && (
          <button
            type="button"
            onClick={toggleSidebar}
            onMouseEnter={handleHoverEnter}
            onMouseLeave={handleHoverLeave}
            title="Show Sidebar"
            aria-label="Show Sidebar"
            className="flex size-[15px] shrink-0 items-center justify-center text-[#5f5e5b] transition-colors hover:text-black cursor-pointer"
          >
            <PanelLeft className="size-[15px] stroke-[1.75]" />
          </button>
        )}
        <div
          className="flex shrink-0 items-center justify-between px-[20px] pt-[20px] select-none"
          data-node-id="658:5956"
        >
          <div className="flex items-center gap-1.5 text-[12px] font-light leading-normal">
            <Link
              href="/projects"
              className="text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
            >
              Projects
            </Link>
            <span className="text-neutral-400 dark:text-neutral-600">/</span>
            <span className="text-black dark:text-neutral-100 font-normal">
              {projectName}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Body Container (Figma Nodes 687:1531 / 859:3446 / 859:3579) */}
      <div className="bg-[rgba(255,255,255,0.1)] flex flex-1 flex-col items-start p-[20px] xl:px-[80px] xl:py-[20px] w-full h-full min-h-0">
        {/* Project Header Subframe (Figma Node 687:1532 / 687:1533) */}
        <div className="flex flex-col items-center justify-center pb-[10px] px-[10px] w-full shrink-0">
          {/* Title Row: Title + 3-Binder Icon on left, MoreHorizontal on right */}
          <div className="flex items-center justify-between p-[10px] w-full shrink-0">
            <div className="flex items-center gap-[20px] h-[69px] shrink-0 select-none">
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  onBlur={commitRename}
                  maxLength={100}
                  aria-label="Rename project title"
                  className="w-[260px] sm:w-[360px] max-w-full rounded-[8px] border border-[#2563EB] bg-white dark:bg-neutral-900 px-[8px] py-[2px] text-[32px] font-medium leading-normal text-black dark:text-neutral-100 outline-none ring-2 ring-[#2563EB]/20"
                />
              ) : (
                <h1 className="text-[32px] font-medium leading-normal text-black dark:text-neutral-100 whitespace-nowrap">
                  {projectName}
                </h1>
              )}
              <ProjectBinderIcon />
            </div>

            <div
              ref={menuContainerRef}
              className="relative flex items-center justify-end pb-[24px] pt-[10px] shrink-0"
            >
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="Project options"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                className="p-1 rounded-md text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                title="Project options"
              >
                <MoreHorizontal className="size-[24px]" />
              </button>

              {/* Project Options Dropdown Menu */}
              {isMenuOpen && !isEditingName && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-[-18px] z-50 w-[180px] rounded-[12px] border border-[rgba(0,0,0,0.08)] dark:border-neutral-800 bg-white dark:bg-neutral-900 p-[4px] shadow-[0px_8px_24px_rgba(0,0,0,0.12)]"
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

          {/* Description Row (Figma Node 687:1555 / 687:1556) */}
          <div className="flex items-start px-[10px] w-full shrink-0">
            {project.description ? (
              <p className="max-w-[896px] text-[14px] font-normal leading-[1.6] tracking-[0.2px] text-black dark:text-neutral-300 line-clamp-2 xl:line-clamp-none">
                {project.description}
              </p>
            ) : project.instructions ? (
              <p className="max-w-[896px] text-[14px] font-normal leading-[1.6] tracking-[0.2px] text-black dark:text-neutral-300 line-clamp-2 xl:line-clamp-none">
                {project.instructions}
              </p>
            ) : (
              <p className="text-[14px] font-normal text-neutral-400 dark:text-neutral-500 italic">
                No description provided
              </p>
            )}
          </div>
        </div>

        {/* 3. Project Tabs Bar & Viewport (Figma Node 687:1557 / 687:2112) */}
        <div className="flex flex-1 flex-col items-start pt-[5px] px-[5px] rounded-[20px] w-full h-full min-h-0">
          {/* Tab Strip */}
          <div className="border-b-[0.5px] border-[rgba(0,0,0,0.22)] dark:border-neutral-800 flex items-start pt-[10px] w-full overflow-x-auto no-scrollbar select-none shrink-0">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center justify-center px-[15px] py-[10px] text-[14px] transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-neutral-900 rounded-tl-[17px] rounded-tr-[17px] font-normal text-black dark:text-white'
                      : 'font-medium text-[#999999] dark:text-neutral-400 hover:text-black dark:hover:text-neutral-200'
                  }`}
                >
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {/* Active Tab Gradient Line (Figma Node 687:1559) */}
                  {isActive && (
                    <span className="absolute inset-x-0 bottom-[-0.5px] h-[2px] bg-gradient-to-r from-[#57C4E5] to-[#EE6055]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Tab Viewport */}
          <div className="w-full flex-1 flex flex-col min-h-0">
            {activeTab === 'threads' ? (
              <ThreadsTab
                projectId={project.id}
                projectName={projectName}
                initialThreads={project.threads || []}
              />
            ) : activeTab === 'instructions' ? (
              <InstructionsTab
                projectId={project.id}
                initialInstructions={project.instructions || ''}
              />
            ) : activeTab === 'memory' ? (
              <MemoriesTab
                projectId={project.id}
                initialMemories={project.memories || []}
              />
            ) : activeTab === 'libraries' ? (
              <LibraryTab
                projectId={project.id}
                initialFiles={project.libraries || []}
              />
            ) : (
              <div className="bg-white dark:bg-neutral-900 flex flex-1 flex-col items-center justify-center min-h-[360px] w-full rounded-[17px] p-6 border border-neutral-100 dark:border-neutral-800/60 shadow-xs">
                <p className="text-[13px] text-neutral-400">
                  Empty shell container for{' '}
                  <span className="font-medium text-neutral-600 dark:text-neutral-300">
                    {TABS.find((t) => t.id === activeTab)?.label}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6 sm:p-7">
          <DialogHeader className="flex flex-col gap-1.5 text-left">
            <DialogTitle className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Delete project?
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-neutral-500">
              This will permanently delete{' '}
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                &ldquo;{projectName}&rdquo;
              </span>{' '}
              along with all of its threads, library files, and memories. This action cannot be undone.
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
    </div>
  );
}
