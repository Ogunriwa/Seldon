'use client';

// ── Imports & React Context ────────────────────────────────────
// Global state management for sidebar toggle status and tablet hover mode
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// ── Types ───────────────────────────────────────────────────────
type SidebarContextType = {
  isOpen: boolean;
  isHoverMode: boolean;
  toggleSidebar: () => void;
  setIsOpen: (open: boolean) => void;
  handleHoverEnter: () => void;
  handleHoverLeave: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// Tablet hover-sidebar range: 768px up to 1279px (< 1280px desktop)
const TABLET_MAX_WIDTH = 1280;

// ── Sidebar Provider Component ──────────────────────────────────
/*
 * Provides global state for whether the SideNav is expanded or collapsed.
 * At desktop widths (>= 1280px), persists the user's preference in localStorage.
 * At tablet widths (< 1280px, e.g., 768px), defaults to collapsed and opens
 * when the user hovers over the SidebarTrigger, staying open while the pointer
 * remains over the SideNav.
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpenState] = useState(true);
  const [isHoverMode, setIsHoverMode] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending hover-close timer
  const clearCloseTimer = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  // ── Effects ───────────────────────────────────────────────────
  // Sync breakpoint mode and hydrate initial state
  useEffect(() => {
    const syncViewportMode = () => {
      const isTablet = window.innerWidth < TABLET_MAX_WIDTH;
      setIsHoverMode(isTablet);
      if (isTablet) {
        // Tablet breakpoint starts with SideNav closed by default
        setIsOpenState(false);
      } else {
        // Desktop breakpoint restores persisted user preference (default true)
        const saved = localStorage.getItem('seldon_sidebar_open');
        setIsOpenState(saved !== null ? saved === 'true' : true);
      }
    };

    syncViewportMode();
    window.addEventListener('resize', syncViewportMode);
    return () => {
      window.removeEventListener('resize', syncViewportMode);
      clearCloseTimer();
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────
  const setIsOpen = (val: boolean) => {
    clearCloseTimer();
    setIsOpenState(val);
    if (!isHoverMode) {
      localStorage.setItem('seldon_sidebar_open', String(val));
    }
  };

  // Invert the sidebar state and persist on desktop
  const toggleSidebar = () => {
    clearCloseTimer();
    setIsOpenState((prev) => {
      const next = !prev;
      if (!isHoverMode) {
        localStorage.setItem('seldon_sidebar_open', String(next));
      }
      return next;
    });
  };

  // Hover handlers for tablet breakpoint (768px)
  const handleHoverEnter = () => {
    clearCloseTimer();
    if (isHoverMode) {
      setIsOpenState(true);
    }
  };

  const handleHoverLeave = () => {
    if (!isHoverMode) return;
    clearCloseTimer();
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpenState(false);
    }, 150);
  };

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isHoverMode,
        toggleSidebar,
        setIsOpen,
        handleHoverEnter,
        handleHoverLeave,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// ── Context Consumer Hook ───────────────────────────────────────
export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
