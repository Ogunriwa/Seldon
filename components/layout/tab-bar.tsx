'use client';

// ── Imports ────────────────────────────────────────────────────
// Next.js routing and UI icons for tab controls
import React from 'react';
import { Home, X, Plus } from 'lucide-react';
import { useTabs } from '@/lib/tabs-context';
import { useRouter } from 'next/navigation';

// ── Tab Bar Component ──────────────────────────────────────────
/*
 * Renders the top horizontal tab strip showing currently open workspaces/chats.
 * Connects to the global tabs context to read open tabs, the active tab, 
 * and expose closing/switching/opening actions.
 */
export function TabBar() {
  // Global state for tabs
  const { tabs, activeTabId, openTab, closeTab, setActiveTabId } = useTabs();
  const router = useRouter();

  /*
   * Creates a new generic tab for a quick chat and navigates to the home view 
   * where the composer can initiate a new conversation.
   */
  const handleNewTab = () => {
    const newChatId = `new-chat-${Date.now()}`;
    openTab({
      id: newChatId,
      title: 'New Chat',
      href: '/',
    });
  };

  // ── Render Tab Strip ──────────────────────────────────────────
  return (
    <div className="flex h-[50px] w-full shrink-0 items-end bg-gradient-to-r from-[#f9f1f2] to-[#f1f6f9] px-[12px] select-none z-30">
      <div className="flex items-end gap-[8px] h-full pl-[12px] overflow-x-auto no-scrollbar">
        {/* Render each tab based on its state/type */}
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;

          // Special case styling for the Home tab
          if (tab.isHome) {
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTabId('home');
                  router.push('/');
                }}
                title="Home"
                className={`flex items-center justify-center px-[20px] py-[10px] rounded-tl-[12px] rounded-tr-[12px] transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white drop-shadow-[0px_-2px_2px_rgba(0,0,0,0.05)] text-gray-900'
                    : 'bg-[#d1d5db]/80 text-[#6b7280] hover:bg-white/80'
                }`}
              >
                <Home className="w-5 h-5" />
              </button>
            );
          }

          // Standard workspace/chat tab
          return (
            <div
              key={tab.id}
              onClick={() => {
                setActiveTabId(tab.id);
                router.push(tab.href);
              }}
              className={`flex items-center gap-[10px] px-[20px] py-[8px] rounded-tl-[10px] rounded-tr-[10px] cursor-pointer transition-all ${
                isActive
                  ? 'bg-white drop-shadow-[0px_-2px_2px_rgba(0,0,0,0.05)] text-black'
                  : 'bg-[#d1d5db]/80 text-[#6b7280] hover:bg-[#d1d5db]'
              }`}
            >
              <span className="text-[13px] font-medium truncate max-w-[160px]">
                {tab.title}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id, e);
                }}
                className="text-[#9ca3af] hover:text-black transition-colors rounded p-0.5"
                title="Close tab"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {/* ── New Tab Button ──────────────────────────────────────── */}
        <button
          onClick={handleNewTab}
          title="New Tab"
          className="p-[12px] flex items-center justify-center text-[#6b7280] hover:text-black transition-colors cursor-pointer"
        >
          <span className="text-base font-medium leading-none">+</span>
        </button>
      </div>
    </div>
  );
}
