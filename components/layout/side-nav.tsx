'use client';

// ── Imports ────────────────────────────────────────────────────
// Routing, icons, and contextual layout hooks for sidebar state
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  PanelLeftClose,
  ChevronRight,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { useSidebar } from '@/lib/sidebar-context';
import { useTabs } from '@/lib/tabs-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ── Side Navigation ────────────────────────────────────────────
/*
 * The main left-hand sidebar for global navigation.
 * Controls collapsing/expanding state via SidebarContext, and pushes 
 * navigated routes to the Tab Context as new or existing tabs.
 * Styled to match exact Figma Dev Mode specifications (node 733:3208).
 */
export function SideNav() {
  // Global sidebar and tab states
  const { isOpen, toggleSidebar, handleHoverEnter, handleHoverLeave } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { openTab } = useTabs();
  const [comingSoonFeature, setComingSoonFeature] = useState<'Agents' | 'Playground' | 'Artifacts' | null>(null);

  // ── Quick Chats Accordion State ──────────────────────────────
  // isChatsOpen: whether the Chats accordion is expanded.
  // quickChats: standalone conversations (projectId IS NULL), newest first.
  // chatsStatus: drives loading / error / empty UI states.
  // refreshKey: bumped by window events to force a re-fetch.
  const [isChatsOpen, setIsChatsOpen] = useState(false);
  const [quickChats, setQuickChats] = useState<SidebarChat[]>([]);
  const [chatsStatus, setChatsStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshKey, setRefreshKey] = useState(0);

  /*
   * Listen for app-wide conversation mutations so the list stays fresh
   * without polling. Dispatched by:
   *   - components/chat.tsx            ('conversation-created')
   *   - components/home/home-view.tsx  ('conversations-changed')
   *   - components/chat/quick-chats-list.tsx ('conversations-changed' on delete)
   */
  useEffect(() => {
    const bump = () => setRefreshKey((k) => k + 1);
    window.addEventListener('conversation-created', bump);
    window.addEventListener('conversations-changed', bump);
    return () => {
      window.removeEventListener('conversation-created', bump);
      window.removeEventListener('conversations-changed', bump);
    };
  }, []);

  /*
   * Fetch quick chats only while the sidebar AND the accordion are open.
   * Re-runs on navigation (pathname) so ordering reflects the latest
   * `updatedAt` after a message is sent. AbortController cancels stale
   * requests if the user toggles quickly or navigates mid-flight.
   * → GET /api/conversations?quickChatsOnly=true (app/api/conversations/route.ts)
   */
  useEffect(() => {
    if (!isOpen || !isChatsOpen) return;
    const controller = new AbortController();

    fetch('/api/conversations?quickChatsOnly=true', {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ conversations: SidebarChat[] }>;
      })
      .then((data) => {
        setQuickChats(
          data.conversations.map((c) => ({ id: c.id, title: c.title }))
        );
        setChatsStatus('ready');
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Failed to load quick chats:', err);
        setChatsStatus('error');
      });

    return () => controller.abort();
  }, [isOpen, isChatsOpen, refreshKey, pathname]);

  // Do not render if the sidebar is collapsed
  if (!isOpen) return null;

  /*
   * Helper to execute navigation: updates tab context and pushes the route
   */
  const navigateTo = (path: string, title: string) => {
    openTab({
      id: path,
      title,
      href: path,
    });
    router.push(path);
  };

  // ── Render Sidebar Layout ────────────────────────────────────
  return (
    <aside
      onMouseEnter={handleHoverEnter}
      onMouseLeave={handleHoverLeave}
      className="relative flex h-full w-[196px] xl:w-[280px] shrink-0 flex-col bg-white border-r border-[rgba(0,0,0,0.12)] px-[12px] py-[16px] gap-[16px] select-none transition-all z-20"
    >
      
      {/* Top Bar: Search & Collapse Header */}
      <div className="flex items-center justify-between px-[16px] py-[10px]">
        <button
          title="Search"
          className="text-gray-500 hover:text-black transition-colors cursor-pointer"
        >
          <Search className="w-[15px] h-[15px]" />
        </button>
        <button
          onClick={toggleSidebar}
          title="Collapse Sidebar"
          className="text-gray-500 hover:text-black transition-colors cursor-pointer"
        >
          <PanelLeftClose className="w-[15px] h-[15px]" />
        </button>
      </div>

      {/* Primary Navigation Section (Core Features) */}
      <div className="flex flex-col gap-[4px] w-full">
        <NavItem
          icon={<ProjectsIcon className="w-5 h-5" />}
          label="Projects"
          active={pathname.startsWith('/projects')}
          onClick={() => navigateTo('/projects', 'Projects')}
        />
        <NavItem
          icon={<AgentsIcon className="w-5 h-5" />}
          label="Agents"
          active={false}
          onClick={() => setComingSoonFeature('Agents')}
        />
        <NavItem
          icon={<PlaygroundIcon className="w-5 h-5" />}
          label="Playground"
          active={false}
          onClick={() => setComingSoonFeature('Playground')}
        />
        <NavItem
          icon={<ArtifactsIcon className="w-5 h-5" />}
          label="Artifacts"
          active={false}
          onClick={() => setComingSoonFeature('Artifacts')}
        />
      </div>

      {/* Section Divider */}
      <div className="px-[16px] w-full">
        <div className="h-px bg-[rgba(0,0,0,0.12)] w-full" />
      </div>

      {/* Quick Chats Accordion (Phase 9) — Recents & Tagged deprecated */}
      <div className="flex min-h-0 flex-1 flex-col gap-[4px] w-full">
        <NavItem
          label="Chats"
          active={!isChatsOpen && pathname.startsWith('/c/')}
          onClick={() => setIsChatsOpen((open) => !open)}
          ariaExpanded={isChatsOpen}
          ariaControls="sidebar-quick-chats"
          trailing={
            isChatsOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )
          }
        />

        {isChatsOpen && (
          <div
            id="sidebar-quick-chats"
            className="min-h-0 flex-1 overflow-y-auto pl-[28px] pr-[4px]"
          >
            {chatsStatus === 'loading' && quickChats.length === 0 ? (
              <p className="px-[12px] py-[8px] text-[12px] text-gray-400">Loading chats…</p>
            ) : chatsStatus === 'error' ? (
              <div className="flex items-center gap-[8px] px-[12px] py-[8px] text-[12px] text-red-500">
                <span>Couldn&apos;t load chats.</span>
                <button
                  type="button"
                  onClick={() => {
                    setChatsStatus('loading');
                    setRefreshKey((k) => k + 1);
                  }}
                  className="underline cursor-pointer hover:text-red-700"
                >
                  Retry
                </button>
              </div>
            ) : quickChats.length === 0 ? (
              <p className="px-[12px] py-[8px] text-[12px] text-gray-400">No quick chats yet</p>
            ) : (
              <ul className="flex flex-col gap-[2px]">
                {quickChats.map((chat) => {
                  const href = `/c/${chat.id}`;
                  const isActive = pathname === href;
                  return (
                    <li key={chat.id}>
                      <button
                        type="button"
                        title={chat.title}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => navigateTo(href, chat.title)}
                        className={`block w-full truncate rounded-[10px] px-[12px] py-[8px] text-left text-[13px] leading-tight transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#F3F4F6] text-[#111827] font-medium'
                            : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
                        }`}
                      >
                        {chat.title}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Settings Footer */}
      <div className="w-full">
        <NavItem
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
          active={pathname === '/settings'}
          onClick={() => navigateTo('/settings', 'Settings')}
        />
      </div>

      {/* Coming Soon Modal */}
      <Dialog
        open={comingSoonFeature !== null}
        onOpenChange={(open) => {
          if (!open) setComingSoonFeature(null);
        }}
      >
        <DialogContent className="max-w-sm rounded-2xl p-6 text-center sm:p-7">
          <DialogHeader className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-[rgba(238,96,85,0.15)] to-[rgba(87,196,229,0.18)] text-neutral-800">
              <span className="text-xl">✨</span>
            </div>
            <DialogTitle className="text-lg font-semibold text-neutral-900 text-center">
              {comingSoonFeature ? `${comingSoonFeature} coming soon` : ''}
            </DialogTitle>
            <DialogDescription className="text-sm text-neutral-500 text-center">
              {comingSoonFeature ? `${comingSoonFeature} coming soon` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setComingSoonFeature(null)}
              className="px-5 py-2 rounded-xl bg-[#111827] text-white hover:bg-neutral-800 active:scale-95 transition-all text-xs font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

// ── NavItem Subcomponent ──────────────────────────────────────
/*
 * Reusable styling wrapper for sidebar navigation items.
 * Matches exact Figma shape (12px rounded curve, 14px Inter Medium text, 12px gap).
 */
function NavItem({
  icon,
  label,
  active,
  onClick,
  trailing,
  ariaExpanded,
  ariaControls,
}: {
  icon?: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  /** Optional element pinned to the right edge (e.g. accordion chevron) */
  trailing?: React.ReactNode;
  /** Accessibility: set for disclosure/accordion triggers */
  ariaExpanded?: boolean;
  ariaControls?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      className={`flex items-center gap-[12px] px-[16px] py-[10px] rounded-[12px] w-full text-left transition-colors cursor-pointer select-none ${
        active
          ? 'bg-[#F3F4F6] text-[#111827] font-medium'
          : 'text-[#111827] hover:bg-[#F3F4F6] font-medium'
      }`}
    >
      {icon && (
        <span className="shrink-0 flex items-center justify-center text-gray-700">
          {icon}
        </span>
      )}
      <span className="text-[14px] leading-none">{label}</span>
      {trailing && (
        <span className="ml-auto shrink-0 flex items-center">{trailing}</span>
      )}
    </button>
  );
}

/** Minimal shape the sidebar needs from GET /api/conversations */
type SidebarChat = { id: string; title: string };

// ── Exact Figma Custom Vector Icons ───────────────────────────

/** Exact Projects icon from Figma node 733:3214 (three archive binders) */
function ProjectsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <image
        width="20"
        height="20"
        href="data:image/png;base64,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"
      />
    </svg>
  );
}

/** Exact Agents icon from Figma node 733:3217 (Agent-robot-1 chip) */
function AgentsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 22 13" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.42222" y="0.672222" width="15.1548" height="10.7556" rx="0.672222" fill="white" stroke="#34322D" strokeWidth="1.34444"/>
      <line x1="7.09214" y1="4.0332" x2="7.09214" y2="8.06654" stroke="black" strokeWidth="1.34444"/>
      <line x1="15.3421" y1="4.0332" x2="15.3421" y2="8.06654" stroke="black" strokeWidth="1.34444"/>
      <line x1="2.75" y1="6.05113" x2="0.00012207" y2="6.05113" stroke="#34322D" strokeWidth="1.34444"/>
      <line x1="22" y1="6.05113" x2="19.2501" y2="6.05113" stroke="#34322D" strokeWidth="1.34444"/>
    </svg>
  );
}

/** Exact Playground icon from Figma node 733:3225 (retro GameBoy console) */
function PlaygroundIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M9.94792 1.04102H10.0521C11.7757 1.041 13.1398 1.04099 14.2071 1.20042C15.3104 1.36524 16.1852 1.71169 16.8663 2.4683C17.5387 3.21548 17.8388 4.15953 17.9832 5.35231C18.125 6.52447 18.125 8.0285 18.125 9.95585V10.0428C18.125 11.9702 18.125 13.4743 17.9832 14.6464C17.8388 15.8392 17.5387 16.7832 16.8663 17.5304C16.1852 18.287 15.3104 18.6334 14.2071 18.7983C13.1398 18.9577 11.7757 18.9577 10.0521 18.9577H9.94792C8.22433 18.9577 6.86017 18.9577 5.79289 18.7983C4.68956 18.6334 3.81474 18.287 3.13379 17.5304C2.46133 16.7832 2.16115 15.8392 2.01682 14.6464C1.87498 13.4743 1.87499 11.9702 1.875 10.0428V9.95585C1.87499 8.02851 1.87498 6.52447 2.01682 5.35231C2.16115 4.15953 2.46133 3.21548 3.13379 2.4683C3.81474 1.71169 4.68956 1.36524 5.79289 1.20042C6.86017 1.04099 8.22435 1.041 9.94792 1.04102ZM5.97757 2.43671C5.03855 2.57698 4.48031 2.84072 4.06291 3.30451C3.63703 3.77772 3.38803 4.42596 3.25777 5.50247C3.12608 6.59078 3.125 8.01922 3.125 9.99935C3.125 11.9795 3.12608 13.4079 3.25777 14.4963C3.38803 15.5728 3.63703 16.221 4.06291 16.6942C4.48031 17.1579 5.03855 17.4217 5.97757 17.562C6.94191 17.706 8.21267 17.7077 10 17.7077C11.7873 17.7077 13.0581 17.706 14.0224 17.562C14.9614 17.4217 15.5197 17.1579 15.9371 16.6942C16.363 16.221 16.612 15.5728 16.7422 14.4963C16.8739 13.4079 16.875 11.9795 16.875 9.99935C16.875 8.01922 16.8739 6.59078 16.7422 5.50247C16.612 4.42596 16.363 3.77772 15.9371 3.30451C15.5197 2.84072 14.9614 2.57698 14.0224 2.43671C13.0581 2.29265 11.7873 2.29102 10 2.29102C8.21267 2.29102 6.94191 2.29265 5.97757 2.43671ZM7.4301 4.3743C7.45317 4.37432 7.47647 4.37435 7.5 4.37435H12.5C12.5235 4.37435 12.5468 4.37432 12.5699 4.3743C12.8872 4.37397 13.161 4.37367 13.4019 4.43824C14.049 4.61162 14.5544 5.11702 14.7277 5.76407C14.7923 6.00502 14.7921 6.27879 14.7917 6.59612C14.7917 6.61918 14.7917 6.64248 14.7917 6.66602C14.7917 6.68955 14.7917 6.71285 14.7917 6.73592C14.7921 7.05325 14.7923 7.32702 14.7277 7.56797C14.5544 8.21502 14.049 8.72043 13.4019 8.89377C13.161 8.95835 12.8872 8.9581 12.5699 8.95777C12.5468 8.95768 12.5235 8.95768 12.5 8.95768H7.5C7.47647 8.95768 7.45317 8.95768 7.4301 8.95777C7.11277 8.9581 6.839 8.95835 6.59805 8.89377C5.951 8.72043 5.4456 8.21502 5.27223 7.56797C5.20766 7.32702 5.20795 7.05325 5.20828 6.73592C5.20831 6.71285 5.20833 6.68955 5.20833 6.66602C5.20833 6.64248 5.20831 6.61918 5.20828 6.59612C5.20795 6.27879 5.20766 6.00502 5.27223 5.76407C5.4456 5.11702 5.951 4.61162 6.59805 4.43824C6.839 4.37367 7.11277 4.37397 7.4301 4.3743ZM7.5 5.62435C7.07227 5.62435 6.98102 5.62972 6.92158 5.64565C6.70589 5.70344 6.53743 5.87191 6.47963 6.08759C6.4637 6.14703 6.45833 6.23829 6.45833 6.66602C6.45833 7.09374 6.4637 7.185 6.47963 7.24445C6.53743 7.46012 6.70589 7.6286 6.92158 7.68639C6.98102 7.70232 7.07227 7.70768 7.5 7.70768H12.5C12.9277 7.70768 13.019 7.70232 13.0784 7.68639C13.2941 7.6286 13.4626 7.46012 13.5203 7.24445C13.5363 7.185 13.5417 7.09374 13.5417 6.66602C13.5417 6.23829 13.5363 6.14703 13.5203 6.08759C13.4626 5.87191 13.2941 5.70344 13.0784 5.64565C13.019 5.62972 12.9277 5.62435 12.5 5.62435H7.5ZM7.08333 11.041C7.42851 11.041 7.70833 11.3208 7.70833 11.666V12.291H8.33333C8.6785 12.291 8.95833 12.5708 8.95833 12.916C8.95833 13.2612 8.6785 13.541 8.33333 13.541H7.70833V14.166C7.70833 14.5112 7.42851 14.791 7.08333 14.791C6.73816 14.791 6.45833 14.5112 6.45833 14.166V13.541H5.83333C5.48816 13.541 5.20833 13.2612 5.20833 12.916C5.20833 12.5708 5.48816 12.291 5.83333 12.291H6.45833V11.666C6.45833 11.3208 6.73816 11.041 7.08333 11.041Z" fill="#34322D"/>
      <path d="M13.6115 11.5284C13.6115 11.912 13.3006 12.2229 12.9171 12.2229C12.5336 12.2229 12.2227 11.912 12.2227 11.5284C12.2227 11.1449 12.5336 10.834 12.9171 10.834C13.3006 10.834 13.6115 11.1449 13.6115 11.5284Z" fill="#34322D"/>
      <path d="M13.6115 14.3058C13.6115 14.6893 13.3006 15.0002 12.9171 15.0002C12.5336 15.0002 12.2227 14.6893 12.2227 14.3058C12.2227 13.9222 12.5336 13.6113 12.9171 13.6113C13.3006 13.6113 13.6115 13.9222 13.6115 14.3058Z" fill="#34322D"/>
      <path d="M12.2229 12.9171C12.2229 13.3006 11.912 13.6115 11.5284 13.6115C11.1449 13.6115 10.834 13.3006 10.834 12.9171C10.834 12.5336 11.1449 12.2227 11.5284 12.2227C11.912 12.2227 12.2229 12.5336 12.2229 12.9171Z" fill="#34322D"/>
      <path d="M15.0002 12.9171C15.0002 13.3006 14.6893 13.6115 14.3058 13.6115C13.9222 13.6115 13.6113 13.3006 13.6113 12.9171C13.6113 12.5336 13.9222 12.2227 14.3058 12.2227C14.6893 12.2227 15.0002 12.5336 15.0002 12.9171Z" fill="#34322D"/>
    </svg>
  );
}

/** Exact Artifacts icon from Figma node 733:3233 (Reicon / widget-add) */
function ArtifactsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M5.37399 1.45899C4.62527 1.45896 4.0009 1.45894 3.50525 1.52558C2.98209 1.59592 2.50976 1.75064 2.1302 2.1302C1.75064 2.50976 1.59592 2.98209 1.52558 3.50525C1.45894 4.0009 1.45896 4.62524 1.45899 5.37397V5.46065C1.45896 6.20938 1.45894 6.83374 1.52558 7.32939C1.59592 7.85255 1.75064 8.32488 2.1302 8.7044C2.50976 9.08398 2.98209 9.23874 3.50525 9.30907C4.0009 9.37574 4.62524 9.37565 5.37397 9.37565H5.46065C6.20938 9.37565 6.83374 9.37574 7.32939 9.30907C7.85255 9.23874 8.32488 9.08398 8.7044 8.7044C9.08398 8.32488 9.23874 7.85255 9.30907 7.32939C9.37574 6.83374 9.37565 6.2094 9.37565 5.46068V5.37399C9.37565 4.62527 9.37574 4.0009 9.30907 3.50525C9.23874 2.98209 9.08398 2.50976 8.7044 2.1302C8.32488 1.75064 7.85255 1.59592 7.32939 1.52558C6.83374 1.45894 6.2094 1.45896 5.46068 1.45899H5.37399ZM3.01409 3.01409C3.12269 2.90549 3.28726 2.81614 3.67182 2.76444C4.07434 2.71032 4.61398 2.70899 5.41732 2.70899C6.22066 2.70899 6.76029 2.71032 7.16283 2.76444C7.54738 2.81614 7.71196 2.90549 7.82056 3.01409C7.92915 3.12269 8.01851 3.28726 8.07021 3.67182C8.12433 4.07434 8.12565 4.61398 8.12565 5.41732C8.12565 6.22066 8.12433 6.76029 8.07021 7.16283C8.01851 7.54738 7.92915 7.71196 7.82056 7.82056C7.71196 7.92915 7.54738 8.01851 7.16283 8.07021C6.76029 8.12433 6.22066 8.12565 5.41732 8.12565C4.61398 8.12565 4.07434 8.12433 3.67182 8.07021C3.28726 8.01851 3.12269 7.92915 3.01409 7.82056C2.90549 7.71196 2.81614 7.54738 2.76444 7.16283C2.71032 6.76029 2.70899 6.22066 2.70899 5.41732C2.70899 4.61398 2.71032 4.07434 2.76444 3.67182C2.81614 3.28726 2.90549 3.12269 3.01409 3.01409Z" fill="#34322D"/>
      <path d="M15.209 2.91602C15.209 2.57084 14.9292 2.29102 14.584 2.29102C14.2388 2.29102 13.959 2.57084 13.959 2.91602V4.79102H12.084C11.7388 4.79102 11.459 5.07084 11.459 5.41602C11.459 5.7612 11.7388 6.04102 12.084 6.04102H13.959V7.91602C13.959 8.2612 14.2388 8.54102 14.584 8.54102C14.9292 8.54102 15.209 8.2612 15.209 7.91602V6.04102H17.084C17.4292 6.04102 17.709 5.7612 17.709 5.41602C17.709 5.07084 17.4292 4.79102 17.084 4.79102H15.209V2.91602Z" fill="#34322D"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M14.54 10.625H14.6267C15.3754 10.625 15.9998 10.6249 16.4954 10.6916C17.0186 10.7619 17.4909 10.9167 17.8704 11.2962C18.25 11.6758 18.4047 12.1481 18.4751 12.6712C18.5417 13.1669 18.5417 13.7913 18.5417 14.5399V14.6267C18.5417 15.3754 18.5417 15.9998 18.4751 16.4954C18.4047 17.0186 18.25 17.4909 17.8704 17.8704C17.4909 18.25 17.0186 18.4047 16.4954 18.4751C15.9998 18.5417 15.3754 18.5417 14.6267 18.5417H14.54C13.7913 18.5417 13.1669 18.5417 12.6712 18.4751C12.1481 18.4047 11.6758 18.25 11.2962 17.8704C10.9167 17.4909 10.7619 17.0186 10.6916 16.4954C10.6249 15.9998 10.625 15.3754 10.625 14.6267V14.54C10.625 13.7912 10.6249 13.1669 10.6916 12.6712C10.7619 12.1481 10.9167 11.6758 11.2962 11.2962C11.6758 10.9167 12.1481 10.7619 12.6712 10.6916C13.1669 10.6249 13.7912 10.625 14.54 10.625ZM12.8378 11.9304C12.4533 11.9822 12.2887 12.0715 12.1801 12.1801C12.0715 12.2887 11.9822 12.4533 11.9304 12.8378C11.8763 13.2403 11.875 13.78 11.875 14.5833C11.875 15.3867 11.8763 15.9263 11.9304 16.3288C11.9822 16.7134 12.0715 16.878 12.1801 16.9866C12.2887 17.0952 12.4533 17.1845 12.8378 17.2362C13.2403 17.2903 13.78 17.2917 14.5833 17.2917C15.3867 17.2917 15.9263 17.2903 16.3288 17.2362C16.7134 17.1845 16.878 17.0952 16.9866 16.9866C17.0952 16.878 17.1845 16.7134 17.2362 16.3288C17.2903 15.9263 17.2917 15.3867 17.2917 14.5833C17.2917 13.78 17.2903 13.2403 17.2362 12.8378C17.1845 12.4533 17.0952 12.2887 16.9866 12.1801C16.878 12.0715 16.7134 11.9822 16.3288 11.9304C15.9263 11.8763 15.3867 11.875 14.5833 11.875C13.78 11.875 13.2403 11.8763 12.8378 11.9304Z" fill="#34322D"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M5.37399 10.625C4.62525 10.625 4.0009 10.6249 3.50525 10.6916C2.98209 10.7619 2.50976 10.9167 2.1302 11.2962C1.75064 11.6758 1.59592 12.1481 1.52558 12.6712C1.45894 13.1669 1.45896 13.7912 1.45899 14.54V14.6267C1.45896 15.3754 1.45894 15.9998 1.52558 16.4954C1.59592 17.0186 1.75064 17.4909 2.1302 17.8704C2.50976 18.25 2.98209 18.4047 3.50525 18.4751C4.0009 18.5417 4.62524 18.5417 5.37397 18.5417H5.46065C6.20938 18.5417 6.83374 18.5417 7.32939 18.4751C7.85255 18.4047 8.32488 18.25 8.7044 17.8704C9.08398 17.4909 9.23874 17.0186 9.30907 16.4954C9.37574 15.9998 9.37565 15.3754 9.37565 14.6267V14.54C9.37565 13.7912 9.37574 13.1669 9.30907 12.6712C9.23874 12.1481 9.08398 11.6758 8.7044 11.2962C8.32488 10.9167 7.85255 10.7619 7.32939 10.6916C6.83374 10.6249 6.20938 10.625 5.46065 10.625H5.37399ZM3.01409 12.1801C3.12269 12.0715 3.28726 11.9822 3.67182 11.9304C4.07434 11.8763 4.61398 11.875 5.41732 11.875C6.22066 11.875 6.76029 11.8763 7.16283 11.9304C7.54738 11.9822 7.71196 12.0715 7.82056 12.1801C7.92915 12.2887 8.01851 12.4533 8.07021 12.8378C8.12433 13.2403 8.12565 13.78 8.12565 14.5833C8.12565 15.3867 8.12433 15.9263 8.07021 16.3288C8.01851 16.7134 7.92915 16.878 7.82056 16.9866C7.71196 17.0952 7.54738 17.1845 7.16283 17.2362C6.76029 17.2903 6.22066 17.2917 5.41732 17.2917C4.61398 17.2917 4.07434 17.2903 3.67182 17.2362C3.28726 17.1845 3.12269 17.0952 3.01409 16.9866C2.90549 16.878 2.81614 16.7134 2.76444 16.3288C2.71032 15.9263 2.70899 15.3867 2.70899 14.5833C2.70899 13.78 2.71032 13.2403 2.76444 12.8378C2.81614 12.4533 2.90549 12.2887 3.01409 12.1801Z" fill="#34322D"/>
    </svg>
  );
}

