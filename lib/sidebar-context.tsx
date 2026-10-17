'use client';

// ── Imports & React Context ────────────────────────────────────
// Global state management for sidebar toggle status
import React, { createContext, useContext, useState, useEffect } from 'react';

// ── Types ───────────────────────────────────────────────────────
type SidebarContextType = {
  isOpen: boolean;
  toggleSidebar: () => void;
  setIsOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// ── Sidebar Provider Component ──────────────────────────────────
/*
 * Provides global state for whether the SideNav is expanded or collapsed.
 * Persists the user's preference in localStorage to maintain visual state 
 * across full page reloads.
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  // ── Effects ───────────────────────────────────────────────────
  // Hydrate initial state from localStorage if a previous preference exists
  useEffect(() => {
    const saved = localStorage.getItem('seldon_sidebar_open');
    if (saved !== null) {
      setIsOpen(saved === 'true');
    }
  }, []);

  // ── Actions ───────────────────────────────────────────────────
  // Invert the sidebar state and persist immediately to localStorage
  const toggleSidebar = () => {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem('seldon_sidebar_open', String(next));
      return next;
    });
  };

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        toggleSidebar,
        setIsOpen: (val) => {
          localStorage.setItem('seldon_sidebar_open', String(val));
          setIsOpen(val);
        },
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
