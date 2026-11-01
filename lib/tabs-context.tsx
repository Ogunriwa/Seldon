'use client';

// ── Imports & React Context ────────────────────────────────────
// Global state management for workspace tabs
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// ── Types & Definitions ─────────────────────────────────────────
export type Tab = {
  id: string;
  title: string;
  href: string;
  isHome?: boolean;
};

type TabsContextType = {
  tabs: Tab[];
  activeTabId: string;
  openTab: (tab: Omit<Tab, 'id'> & { id?: string }) => void;
  closeTab: (id: string, e?: React.MouseEvent) => void;
  renameTab: (idOrHref: string, title: string) => void;
  setActiveTabId: (id: string) => void;
};

// Permanent base tab for the landing view
const defaultHomeTab: Tab = {
  id: 'home',
  title: 'Home',
  href: '/',
  isHome: true,
};

const TabsContext = createContext<TabsContextType | undefined>(undefined);

// ── Tabs Provider Component ─────────────────────────────────────
/*
 * Provides the global tab bar state (open tabs and current active tab).
 * Automatically syncs the Next.js router path with tab states so URL 
 * navigations (e.g. from browser back/forward) reflect in the UI.
 */
export function TabsProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([defaultHomeTab]);
  const [activeTabId, setActiveTabId] = useState<string>('home');
  const pathname = usePathname();
  const router = useRouter();

  // ── Sync Effects ──────────────────────────────────────────────
  /*
   * Keeps track of pathname changes. If a user navigates directly to a URL, 
   * this ensures a tab is dynamically created or focused to match the route.
   */
  useEffect(() => {
    if (pathname === '/') {
      setActiveTabId('home');
      return;
    }

    // Check if an existing tab matches this pathname
    const existing = tabs.find((t) => t.href === pathname);
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      // Auto-register a tab if navigated directly
      let title = 'Page';
      if (pathname.startsWith('/projects/')) {
        title = 'Project';
      } else if (pathname === '/projects') {
        title = 'Projects';
      } else if (pathname.startsWith('/c/')) {
        title = 'Chat';
      }
      const newTab: Tab = {
        id: pathname,
        title,
        href: pathname,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
  }, [pathname]);

  // ── Context Actions ───────────────────────────────────────────
  
  // Opens or focuses a tab based on ID and href
  const openTab = (tabData: Omit<Tab, 'id'> & { id?: string }) => {
    const id = tabData.id || tabData.href;
    const existingIndex = tabs.findIndex((t) => t.id === id || t.href === tabData.href);

    if (existingIndex >= 0) {
      // Tab exists, update title if provided and activate
      setTabs((prev) =>
        prev.map((t, idx) => (idx === existingIndex ? { ...t, ...tabData, id: t.id } : t))
      );
      setActiveTabId(tabs[existingIndex].id);
      router.push(tabData.href);
    } else {
      // Add new tab
      const newTab: Tab = {
        id,
        title: tabData.title,
        href: tabData.href,
        isHome: tabData.isHome,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(id);
      router.push(tabData.href);
    }
  };

  // Updates the title of an existing tab in-place without navigating
  const renameTab = useCallback((idOrHref: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTabs((prev) => {
      let changed = false;
      const next = prev.map((t) => {
        if ((t.id === idOrHref || t.href === idOrHref) && t.title !== trimmed) {
          changed = true;
          return { ...t, title: trimmed };
        }
        return t;
      });
      return changed ? next : prev;
    });
  }, []);

  // Closes a tab and falls back gracefully to adjacent tabs or Home
  const closeTab = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (id === 'home') return; // Cannot close home tab

    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);

    if (activeTabId === id) {
      // Switch to the last available tab or home
      const nextTab = newTabs[newTabs.length - 1] || defaultHomeTab;
      setActiveTabId(nextTab.id);
      router.push(nextTab.href);
    }
  };

  return (
    <TabsContext.Provider
      value={{
        tabs,
        activeTabId,
        openTab,
        closeTab,
        renameTab,
        setActiveTabId,
      }}
    >
      {children}
    </TabsContext.Provider>
  );
}

// ── Context Consumer Hook ───────────────────────────────────────
export function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a TabsProvider');
  }
  return context;
}
