'use client';

// ── Imports ────────────────────────────────────────────────────
// Floating button UI used to restore the left sidebar when collapsed
import React from 'react';
import { PanelLeft } from 'lucide-react';
import { useSidebar } from '@/lib/sidebar-context';

// ── Sidebar Trigger ────────────────────────────────────────────
/*
 * A minimal floating button that appears over the main content area 
 * only when the main SideNav is collapsed. It allows the user to re-open it.
 */
export function SidebarTrigger() {
  const { isOpen, toggleSidebar } = useSidebar();

  // If the sidebar is already open, the toggle button is hidden
  if (isOpen) return null;

  return (
    <button
      onClick={toggleSidebar}
      title="Show Sidebar"
      className="absolute top-3 left-3 z-30 flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-background/95 text-muted-foreground shadow-xs backdrop-blur-sm transition-all hover:bg-accent hover:text-foreground"
    >
      <PanelLeft className="h-4 w-4" />
    </button>
  );
}
