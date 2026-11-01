'use client';

// ── Imports & React State ──────────────────────────────────────
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StartProjectModal } from './start-project-modal';
import { useTabs } from '@/lib/tabs-context';
import { useSidebar } from '@/lib/sidebar-context';
import { ProjectCard } from './project-card';

export type ProjectItem = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  instructions: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  threadsCount?: number;
};

// ── Authentic 3-Binder Project Icon (Figma Node 652:862) ───────────────
export function ProjectBinderIcon({ className = 'w-[37px] h-[31px]' }: { className?: string }) {
  return (
    <svg
      width="37"
      height="31"
      viewBox="0 0 37 31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <g clipPath="url(#clip0_652_862)">
        <rect
          width="11.1893"
          height="29.7837"
          rx="0.819337"
          transform="matrix(-0.990725 0.13588 0.142543 0.989789 32.2422 0)"
          fill="#60D394"
        />
        <rect
          x="-0.243232"
          y="0.322806"
          width="4.88871"
          height="14.7208"
          rx="0.532569"
          transform="matrix(-0.990725 0.13588 0.142543 0.989789 29.3956 3.11057)"
          fill="white"
        />
        <rect
          x="-0.243232"
          y="0.322806"
          width="4.88871"
          height="14.7208"
          rx="0.532569"
          transform="matrix(-0.990725 0.13588 0.142543 0.989789 29.3956 3.11057)"
          stroke="black"
          strokeWidth="0.573536"
        />
        <rect
          x="-0.243232"
          y="0.322806"
          width="4.34249"
          height="4.29879"
          rx="2.14939"
          transform="matrix(-0.990725 0.13588 0.142543 0.989789 32.1592 22.3039)"
          fill="white"
        />
        <rect
          x="-0.243232"
          y="0.322806"
          width="4.34249"
          height="4.29879"
          rx="2.14939"
          transform="matrix(-0.990725 0.13588 0.142543 0.989789 32.1592 22.3039)"
          stroke="black"
          strokeWidth="0.573536"
        />
      </g>
      <rect
        x="-0.243232"
        y="0.322806"
        width="10.6157"
        height="29.2101"
        rx="0.532569"
        transform="matrix(-0.990725 0.13588 0.142543 0.989789 31.712 0.0363465)"
        stroke="black"
        strokeWidth="0.573536"
      />
      <rect x="0.286768" y="1.51724" width="10.6209" height="29.1957" rx="0.532569" fill="#57C4E5" />
      <rect
        x="0.286768"
        y="1.51724"
        width="10.6209"
        height="29.1957"
        rx="0.532569"
        stroke="black"
        strokeWidth="0.573536"
      />
      <rect x="3.01919" y="4.24771" width="4.88871" height="14.7208" rx="0.532569" fill="white" />
      <rect
        x="3.01919"
        y="4.24771"
        width="4.88871"
        height="14.7208"
        rx="0.532569"
        stroke="black"
        strokeWidth="0.573536"
      />
      <rect x="3.01919" y="23.6383" width="4.34249" height="4.29879" rx="2.14939" fill="white" />
      <rect
        x="3.01919"
        y="23.6383"
        width="4.34249"
        height="4.29879"
        rx="2.14939"
        stroke="black"
        strokeWidth="0.573536"
      />
      <mask id="path-8-inside-1_652_862" fill="white">
        <path d="M10.3535 1.23047H20.7286C21.1811 1.23047 21.548 1.5973 21.548 2.04981V30.1804C21.548 30.6329 21.1811 30.9997 20.7286 30.9997H11.1729C10.7203 30.9997 10.3535 30.6329 10.3535 30.1804V1.23047Z" />
      </mask>
      <path
        d="M10.3535 1.23047H20.7286C21.1811 1.23047 21.548 1.5973 21.548 2.04981V30.1804C21.548 30.6329 21.1811 30.9997 20.7286 30.9997H11.1729C10.7203 30.9997 10.3535 30.6329 10.3535 30.1804V1.23047Z"
        fill="#EE6055"
      />
      <path
        d="M10.3535 1.23047V0.656933H9.77998V1.23047H10.3535ZM10.3535 1.23047V1.804H20.7286V1.23047V0.656933H10.3535V1.23047ZM21.548 2.04981H20.9744V30.1804H21.548H22.1215V2.04981H21.548ZM20.7286 30.9997V30.4262H11.1729V30.9997V31.5733H20.7286V30.9997ZM10.3535 30.1804H10.9271V1.23047H10.3535H9.77998V30.1804H10.3535ZM11.1729 30.9997V30.4262C11.0371 30.4262 10.9271 30.3161 10.9271 30.1804H10.3535H9.77998C9.77998 30.9497 10.4036 31.5733 11.1729 31.5733V30.9997ZM21.548 30.1804H20.9744C20.9744 30.3161 20.8644 30.4262 20.7286 30.4262V30.9997V31.5733C21.4979 31.5733 22.1215 30.9497 22.1215 30.1804H21.548ZM20.7286 1.23047V1.804C20.8644 1.804 20.9744 1.91405 20.9744 2.04981H21.548H22.1215C22.1215 1.28054 21.4979 0.656933 20.7286 0.656933V1.23047Z"
        fill="black"
        mask="url(#path-8-inside-1_652_862)"
      />
      <rect x="13.3727" y="4.24771" width="4.88871" height="14.7208" rx="0.532569" fill="white" />
      <rect
        x="13.3727"
        y="4.24771"
        width="4.88871"
        height="14.7208"
        rx="0.532569"
        stroke="black"
        strokeWidth="0.573536"
      />
      <rect x="13.3727" y="23.6383" width="4.34249" height="4.29879" rx="2.14939" fill="white" />
      <rect
        x="13.3727"
        y="23.6383"
        width="4.34249"
        height="4.29879"
        rx="2.14939"
        stroke="black"
        strokeWidth="0.573536"
      />
      <defs>
        <clipPath id="clip0_652_862">
          <rect
            width="11.1893"
            height="29.7837"
            rx="0.819337"
            transform="matrix(-0.990725 0.13588 0.142543 0.989789 32.2422 0)"
            fill="white"
          />
        </clipPath>
      </defs>
    </svg>
  );
}

// ── Authentic Wide Chevron Toggle (Figma Node 652:882 / 652:940) ────────
function WideChevron({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="h-[8px] w-[18px] flex items-center justify-center shrink-0">
      <svg
        width="18"
        height="8"
        viewBox="0 0 18 8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-black dark:text-neutral-200 transition-transform duration-200"
      >
        {isOpen ? (
          <path
            d="M3 7L9 1L15 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M3 1L9 7L15 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}

export function ProjectsDashboard({
  initialProjects,
}: {
  initialProjects: ProjectItem[];
}) {
  // ── State & Hooks ──────────────────────────────────────────
  // Manages project list, UI toggles for sections, and global tab navigation.
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecentsOpen, setIsRecentsOpen] = useState(true);
  const [isAllProjectsOpen, setIsAllProjectsOpen] = useState(false);
  const router = useRouter();
  const { openTab } = useTabs();
  const { isOpen, isHoverMode } = useSidebar();

  // ── Handlers ──────────────────────────────────────────
  
  // Opens a project in a new tab within the workspace and navigates there.
  const handleOpenProject = (project: ProjectItem) => {
    openTab({
      id: `/projects/${project.id}`,
      title: project.name,
      href: `/projects/${project.id}`,
    });
    router.push(`/projects/${project.id}`);
  };

  // Prepends a newly created project to the dashboard list.
  const handleProjectCreated = (newProject: ProjectItem) => {
    setProjects((prev) => [newProject, ...prev]);
  };

  // At tablet (< 1280px): 3x3 (9 cards) when SideNav is open (859:2514), 4x3 (12 cards) when closed (870:2640).
  // At desktop (>= 1280px): 5x2 (10 cards).
  const maxRecentCount = isHoverMode ? (isOpen ? 9 : 12) : 10;
  const recentProjects = projects.slice(0, maxRecentCount);

  return (
    <div className="bg-[rgba(255,255,255,0.1)] flex h-full w-full flex-col items-start overflow-y-auto p-[10px] xl:px-[80px] xl:py-[10px]">
      {/* Combined Top Frame (Figma Node 652:858 / 652:1196 / 859:2589 / 870:2715) */}
      <div
        className={`flex flex-col ${
          projects.length === 0 ? 'gap-[20px]' : 'gap-[59px]'
        } items-start w-full ${
          isOpen ? 'pt-[40px]' : 'pt-[8px] xl:pt-[40px]'
        } pb-[10px] px-[10px] shrink-0`}
      >
        {/* Top Header Frame (Figma Node 652:859 / 652:1197 / 859:2590 / 870:2716) */}
        <div className="flex items-center justify-between p-[10px] w-full shrink-0">
          <div className="flex flex-1 items-center gap-[20px] min-w-0">
            <h1 className="text-[32px] font-medium leading-normal text-black dark:text-neutral-100 select-none">
              Projects
            </h1>
            <ProjectBinderIcon />
          </div>

          <div className="flex items-center justify-end py-[24px] shrink-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-[8px] rounded-[8px] bg-black dark:bg-neutral-100 px-[16px] py-[10px] text-[14px] font-medium text-white dark:text-neutral-900 transition-opacity hover:opacity-90 active:scale-[0.98] cursor-pointer select-none shadow-sm"
            >
              <span className="text-[16px] leading-none">+</span>
              <span>New Project</span>
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          /* Empty State (Figma Node 652:1217) */
          <div className="flex flex-1 flex-col gap-[16px] items-center justify-center py-28 text-center w-full select-none">
            <h2 className="text-[20px] font-medium leading-normal text-[#111827] dark:text-neutral-100">
              No projects yet
            </h2>
            <div className="text-[14px] font-normal leading-[1.5] text-[#6b7280] dark:text-neutral-400">
              <p className="m-0">Create your first project to get started.</p>
              <p className="m-0">Projects help you organize files, instructions, and chats.</p>
            </div>
          </div>
        ) : (
          /* Recents Frame (Figma Node 652:879 / 859:2610 / 870:2736) */
          <div className="flex flex-col gap-[20px] items-start px-[10px] py-[20px] w-full shrink-0">
            <div
              onClick={() => setIsRecentsOpen(!isRecentsOpen)}
              className="flex cursor-pointer items-center justify-between border-b border-[rgba(0,0,0,0.18)] dark:border-neutral-800 pb-[10px] select-none w-full"
            >
              <h2 className="text-[20px] font-medium text-black dark:text-neutral-100">
                Recents
              </h2>
              <WideChevron isOpen={isRecentsOpen} />
            </div>

            {isRecentsOpen && (
              <div className="flex flex-wrap gap-x-[20px] gap-y-[40px] xl:gap-[80px] items-start xl:pr-[20px] py-[10px] w-full">
                {recentProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={handleOpenProject}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* All Projects Frame (Figma Node 652:936 / 859:2667 / 870:2789) - Only rendered when projects exist */}
      {projects.length > 0 && (
        <div className="w-full flex items-start pl-[10px] pr-[20px] pt-[10px]">
          <div className="flex flex-1 flex-col gap-[20px] items-start px-[10px] w-full">
            <div
              onClick={() => setIsAllProjectsOpen(!isAllProjectsOpen)}
              className="flex cursor-pointer items-center justify-between border-b border-[rgba(0,0,0,0.18)] dark:border-neutral-800 pb-[10px] select-none w-full"
            >
              <h2 className="text-[20px] font-medium text-black dark:text-neutral-100">
                All Projects
              </h2>
              <WideChevron isOpen={isAllProjectsOpen} />
            </div>

            {isAllProjectsOpen && (
              <div className="flex flex-wrap gap-x-[20px] gap-y-[40px] xl:gap-[80px] items-start xl:pr-[20px] py-[10px] w-full">
                {projects.map((project) => (
                  <ProjectCard
                    key={`all-${project.id}`}
                    project={project}
                    onClick={handleOpenProject}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <StartProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}
