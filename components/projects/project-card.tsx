'use client';

import React from 'react';
import type { ProjectItem } from './projects-dashboard';

interface ProjectCardProps {
  project: ProjectItem;
  onClick: (project: ProjectItem) => void;
}

/**
 * ProjectCard Component (Figma Node 652:885)
 * Renders a 151x131px outer card with coral-to-blue gradient border & banner,
 * housing a 100px white inner pill with title and description.
 */
export function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <div
      onClick={() => onClick(project)}
      className="group relative flex h-[131px] w-[151px] shrink-0 cursor-pointer flex-col items-center justify-end rounded-[20px] border-[0.5px] border-[rgba(0,0,0,0.09)] dark:border-neutral-800 bg-gradient-to-r from-[rgba(238,96,85,0.1)] to-[rgba(87,196,229,0.12)] p-[2.5px] shadow-[0px_5.441px_18.138px_0px_rgba(0,0,0,0.08)] transition-all duration-150 hover:scale-[1.02] hover:shadow-[0px_8px_20px_0px_rgba(0,0,0,0.1)] active:scale-[0.99] select-none"
    >
      {/* Bottom White Content Pill (Figma Node 652:886) */}
      <div className="flex h-[100px] w-full flex-col gap-[6.8px] items-start rounded-[18px] bg-white dark:bg-neutral-900 p-[10px]">
        {/* Header Row (Figma Node 652:887) */}
        <div className="w-full pb-[2.3px]">
          <h3 className="truncate text-[10.9px] font-bold tracking-[-0.22px] text-[#111827] dark:text-neutral-100 leading-[1.25]">
            {project.name}
          </h3>
        </div>
        {/* Body Description (Figma Node 652:889 / 859:2620 / 870:2746) */}
        <p className="line-clamp-4 text-[6.35px] font-normal leading-[1.5] text-[#6b7280] dark:text-neutral-400">
          {project.description ||
            project.instructions ||
            'Persistent workspace where files, instructions, and chats share one lasting memory.'}
        </p>
      </div>
    </div>
  );
}
