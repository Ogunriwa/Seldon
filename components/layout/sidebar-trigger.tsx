'use client';

// ── Imports ────────────────────────────────────────────────────
// Top-left sidebar icon row used to restore the left sidebar when collapsed
import React from 'react';
import { usePathname } from 'next/navigation';
import { PanelLeft } from 'lucide-react';
import { useSidebar } from '@/lib/sidebar-context';

// ── Sidebar Trigger ────────────────────────────────────────────
/*
 * Renders the top-left 47px header strip (p-[16px] with a 15px×15px sidebar icon)
 * matching Figma node 859:2123 when the SideNav is collapsed.
 * At the tablet breakpoint (768px), hovering over the trigger button opens the SideNav.
 * On Project Workspace pages (/projects/[id]), the trigger is rendered inline inside
 * the breadcrumb header row (Figma nodes 859:3640, 860:5401, 859:4076).
 */
export function SidebarTrigger() {
  const pathname = usePathname();
  const { isOpen, toggleSidebar, handleHoverEnter, handleHoverLeave } = useSidebar();

  // If the sidebar is already open, or if we are on /projects/[id] (which renders its own inline trigger), hide this strip
  if (isOpen || (pathname.startsWith('/projects/') && pathname !== '/projects')) {
    return null;
  }

  return (
    <div className="flex w-full shrink-0 items-center p-[16px]">
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
    </div>
  );
}
