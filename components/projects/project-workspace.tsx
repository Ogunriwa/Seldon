'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
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
  const router = useRouter();

  return (
    <div className="flex h-full w-full flex-col items-start" data-node-id="687:1529">
      {/* 1. Breadcrumbs Routing Header (Figma Node 687:1530 / 658:5956) */}
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
            {project.name}
          </span>
        </div>
      </div>

      {/* 2. Main Body Container (Figma Node 687:1531) */}
      <div className="bg-[rgba(255,255,255,0.1)] flex flex-1 flex-col items-start px-6 md:px-[80px] py-[20px] w-full h-full min-h-0">
        {/* Project Header Subframe (Figma Node 687:1532 / 687:1533) */}
        <div className="flex flex-col items-center justify-center pb-[10px] px-[10px] w-full shrink-0">
          {/* Title Row: Title + 3-Binder Icon on left, MoreHorizontal on right */}
          <div className="flex items-center justify-between p-[10px] w-full shrink-0">
            <div className="flex items-center gap-[20px] h-[69px] shrink-0 select-none">
              <h1 className="text-[32px] font-medium leading-normal text-black dark:text-neutral-100 whitespace-nowrap">
                {project.name}
              </h1>
              <ProjectBinderIcon />
            </div>

            <div className="flex items-center justify-end pb-[24px] pt-[10px] shrink-0">
              <button
                type="button"
                className="p-1 rounded-md text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                title="Project options"
              >
                <MoreHorizontal className="size-[24px]" />
              </button>
            </div>
          </div>

          {/* Description Row (Figma Node 687:1555 / 687:1556) */}
          <div className="flex items-start px-[10px] w-full shrink-0">
            {project.description ? (
              <p className="max-w-[896px] text-[14px] font-normal leading-[1.6] tracking-[0.2px] text-black dark:text-neutral-300">
                {project.description}
              </p>
            ) : project.instructions ? (
              <p className="max-w-[896px] text-[14px] font-normal leading-[1.6] tracking-[0.2px] text-black dark:text-neutral-300">
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
          <div className="w-full flex-1 flex flex-col min-h-0 mt-[10px]">
            {activeTab === 'threads' ? (
              <ThreadsTab
                projectId={project.id}
                projectName={project.name}
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
    </div>
  );
}
