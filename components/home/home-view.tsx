'use client';

// ── Imports & React State ──────────────────────────────────────
// Core React functionality, icons, and contextual hooks for tabs/routing
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowRight, ArrowUp, ChevronDown } from 'lucide-react';
import { useTabs } from '@/lib/tabs-context';
import { useSidebar } from '@/lib/sidebar-context';
import { StartProjectModal } from '@/components/projects/start-project-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ── Home View Dashboard ─────────────────────────────────────────
/*
 * The primary landing screen of the workspace.
 * Displays quick links (Projects, Playground, Agents) and a composer 
 * input at the bottom for instantly creating a new Quick Chat.
 */
export function HomeView() {
  // ── State Declarations ────────────────────────────────────────
  // Message input, LLM models list, and UI modal states
  const [message, setMessage] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('qwen2.5:latest');
  const [isSending, setIsSending] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState<'Agents' | 'Playground' | null>(null);
  const router = useRouter();
  const { openTab } = useTabs();
  const { isOpen } = useSidebar();

  // ── Effects & Data Fetching ───────────────────────────────────
  /*
   * On mount, fetch the list of available models to populate the composer dropdown.
   */
  useEffect(() => {
    // → GET /api/models — handled by app/api/models/route.ts
    fetch('/api/models')
      .then((r) => r.json())
      .then((data) => {
        if (data.models && data.models.length > 0) {
          setModels(data.models);
          setSelectedModel(data.models[0]);
        }
      })
      .catch((err) => console.error('Error fetching models:', err));
  }, []);

  // ── Interaction Handlers ──────────────────────────────────────
  /*
   * Submits the first message to create a standalone conversation thread.
   * Stashes the prompt into sessionStorage so the resulting chat view can hydrate it.
   */
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      // Create a standalone Quick Chat
      // → POST /api/conversations — handled by app/api/conversations/route.ts
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          firstMessage: trimmed,
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        // Save initial prompt in sessionStorage so /c/[id] automatically triggers it
        sessionStorage.setItem(`pending_prompt_${data.id}`, trimmed);
        // Tell the SideNav Quick Chats accordion to re-fetch
        window.dispatchEvent(new CustomEvent('conversations-changed'));
        openTab({
          id: `/c/${data.id}`,
          title: data.title || 'Quick Chat',
          href: `/c/${data.id}`,
        });
        router.push(`/c/${data.id}`);
      }
    } catch (err) {
      console.error('Failed to create quick chat:', err);
    } finally {
      setIsSending(false);
    }
  };

  /*
   * Helper to open a feature view (e.g., Projects dashboard) in a new tab
   */
  const navigateTo = (path: string, title: string) => {
    openTab({
      id: path,
      title,
      href: path,
    });
    router.push(path);
  };

  // ── Render Dashboard UI ───────────────────────────────────────
  return (
    <div
      className={`relative flex min-h-full h-full w-full flex-col items-center justify-center ${
        isOpen ? 'p-[10px] xl:px-[40px]' : 'px-[40px] py-[10px]'
      }`}
    >
      <div className="flex flex-1 flex-col items-center justify-center p-[10px] w-full">
        {/* Centered Content Cluster (Figma node 733:3263 / 859:2127 / 859:2277) */}
        <div
          className={`flex flex-col items-center justify-center gap-[40px] my-auto ${
            isOpen ? 'w-full max-w-[533px] xl:max-w-[653px]' : 'w-full max-w-[653px]'
          }`}
        >
          {/* 3 Quick Entry Cards (Figma node 733:3424 / 859:2128 / 859:2278) */}
          <div
            className={`flex flex-nowrap items-end justify-center w-full pb-[86px] pt-[10px] select-none ${
              isOpen ? 'gap-[40px] xl:gap-[100px]' : 'gap-[100px]'
            }`}
          >
        {/* Projects Card (Figma node 733:3425) */}
        <div 
          onClick={() => navigateTo('/projects', 'Projects')}
          className="group relative flex flex-col w-[151px] h-[78px] bg-white rounded-[20px] border-[0.5px] border-[rgba(0,0,0,0.09)] shadow-[0px_5.441px_18.138px_0px_rgba(0,0,0,0.08)] overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)] cursor-pointer select-none"
        >
          <div className="h-[45px] w-full shrink-0 bg-gradient-to-r from-[rgba(238,96,85,0.1)] to-[rgba(87,196,229,0.12)] rounded-tl-[12.7px] rounded-tr-[13.6px] mb-[-18.14px]" />
          <div className="relative z-10 flex items-center justify-between bg-white rounded-[18px] px-[14px] py-[10px] w-full h-[51px]">
            <span className="font-bold text-[10.9px] text-[#111827] tracking-[-0.22px] leading-[1.1]">
              Projects
            </span>
            <div className="flex items-center gap-[5px]" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setIsProjectModalOpen(true)}
                title="New Project"
                className="w-[18.14px] h-[18.14px] rounded-full bg-[#111827] text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              >
                <Plus className="w-[9px] h-[9px] stroke-[2.5]" />
              </button>
              <button
                onClick={() => navigateTo('/projects', 'Projects')}
                title="Open Projects"
                className="w-[18.14px] h-[18.14px] rounded-full bg-[#F2F2F2] text-[#111827] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              >
                <ArrowRight className="w-[8px] h-[8px] stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* Playground Card (Figma node 733:3436) */}
        <div 
          onClick={() => setComingSoonFeature('Playground')}
          className="group relative flex flex-col w-[151px] h-[78px] bg-white rounded-[20px] border-[0.5px] border-[rgba(0,0,0,0.09)] shadow-[0px_5.441px_18.138px_0px_rgba(0,0,0,0.08)] overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)] cursor-pointer select-none"
        >
          <div className="h-[45px] w-full shrink-0 bg-gradient-to-r from-[rgba(238,96,85,0.1)] to-[rgba(87,196,229,0.12)] rounded-tl-[12.7px] rounded-tr-[13.6px] mb-[-18.14px]" />
          <div className="relative z-10 flex items-center justify-between bg-white rounded-[18px] px-[14px] py-[10px] w-full h-[51px]">
            <span className="font-bold text-[10.9px] text-[#111827] tracking-[-0.22px] leading-[1.1]">
              Playground
            </span>
            <div className="flex items-center gap-[5px]" onClick={(e) => { e.stopPropagation(); setComingSoonFeature('Playground'); }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setComingSoonFeature('Playground'); }}
                title="Playground coming soon"
                className="w-[18.14px] h-[18.14px] rounded-full bg-[#111827] text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              >
                <Plus className="w-[9px] h-[9px] stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setComingSoonFeature('Playground'); }}
                title="Playground coming soon"
                className="w-[18.14px] h-[18.14px] rounded-full bg-[#F2F2F2] text-[#111827] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              >
                <ArrowRight className="w-[8px] h-[8px] stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* Agents Card (Figma node 733:3447) */}
        <div 
          onClick={() => setComingSoonFeature('Agents')}
          className="group relative flex flex-col w-[151px] h-[78px] bg-white rounded-[20px] border-[0.5px] border-[rgba(0,0,0,0.09)] shadow-[0px_5.441px_18.138px_0px_rgba(0,0,0,0.08)] overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)] cursor-pointer select-none"
        >
          <div className="h-[45px] w-full shrink-0 bg-gradient-to-r from-[rgba(238,96,85,0.1)] to-[rgba(87,196,229,0.12)] rounded-tl-[12.7px] rounded-tr-[13.6px] mb-[-18.14px]" />
          <div className="relative z-10 flex items-center justify-between bg-white rounded-[18px] px-[14px] py-[10px] w-full h-[51px]">
            <span className="font-bold text-[10.9px] text-[#111827] tracking-[-0.22px] leading-[1.1]">
              Agents
            </span>
            <div className="flex items-center gap-[5px]" onClick={(e) => { e.stopPropagation(); setComingSoonFeature('Agents'); }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setComingSoonFeature('Agents'); }}
                title="Agents coming soon"
                className="w-[18.14px] h-[18.14px] rounded-full bg-[#111827] text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              >
                <Plus className="w-[9px] h-[9px] stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setComingSoonFeature('Agents'); }}
                title="Agents coming soon"
                className="w-[18.14px] h-[18.14px] rounded-full bg-[#F2F2F2] text-[#111827] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              >
                <ArrowRight className="w-[8px] h-[8px] stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section (Figma node 733:3286 / 859:2162 / 859:2312) */}
      <div className="flex items-end justify-center xl:justify-start gap-[40px] w-full text-left select-none">
        {/* Authentic Mentat Prism Logo (Figma node 733:3088: 27.96px x 74.15px) */}
        <div className="relative w-[28px] h-[75px] shrink-0" aria-hidden="true">
          <svg
            width="28"
            height="75"
            viewBox="0 0 28 75"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <g clipPath="url(#clip0_733_3088)">
              <rect width="27.96" height="74.145" fill="white" className="dark:fill-transparent" />
              <g filter="url(#filter0_n_733_3088)">
                <path
                  d="M13.7239 0L13.7238 53.7332V74.145L0.00390625 53.7332L13.7239 0Z"
                  fill="url(#paint0_linear_733_3088)"
                  fillOpacity="0.59"
                />
                <path
                  d="M13.7239 0L13.7238 53.7332V74.145L0.00390625 53.7332L13.7239 0Z"
                  fill="url(#paint1_linear_733_3088)"
                  fillOpacity="0.59"
                />
                <path
                  d="M13.457 0.777344L-0.00613403 47.8009V53.8495L13.457 0.777344Z"
                  fill="url(#paint2_linear_733_3088)"
                  fillOpacity="0.59"
                />
              </g>
              <g filter="url(#filter1_n_733_3088)">
                <path
                  d="M14.2351 0L14.2352 53.7332V74.145L27.9551 53.7332L14.2351 0Z"
                  fill="url(#paint3_linear_733_3088)"
                  fillOpacity="0.66"
                />
                <path
                  d="M14.2351 0L14.2352 53.7332V74.145L27.9551 53.7332L14.2351 0Z"
                  fill="url(#paint4_linear_733_3088)"
                  fillOpacity="0.66"
                />
                <path
                  d="M14.4902 0.777344L27.9534 47.8009V53.8495L14.4902 0.777344Z"
                  fill="url(#paint5_linear_733_3088)"
                />
              </g>
            </g>
            <defs>
              <filter
                id="filter0_n_733_3088"
                x="-0.00585938"
                y="0"
                width="13.7305"
                height="74.1445"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="1.9490070343017578 1.9490070343017578"
                  stitchTiles="stitch"
                  numOctaves="3"
                  result="noise"
                  seed="6126"
                />
                <feColorMatrix in="noise" type="luminanceToAlpha" result="alphaNoise" />
                <feComponentTransfer in="alphaNoise" result="coloredNoise1">
                  <feFuncA
                    type="discrete"
                    tableValues="1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 "
                  />
                </feComponentTransfer>
                <feComposite operator="in" in2="shape" in="coloredNoise1" result="noise1Clipped" />
                <feFlood floodColor="rgba(0, 0, 0, 0.25)" result="color1Flood" />
                <feComposite operator="in" in2="noise1Clipped" in="color1Flood" result="color1" />
                <feMerge result="effect1_noise_733_3088">
                  <feMergeNode in="shape" />
                  <feMergeNode in="color1" />
                </feMerge>
              </filter>
              <filter
                id="filter1_n_733_3088"
                x="14.2344"
                y="0"
                width="13.7207"
                height="74.1445"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="1.9490070343017578 1.9490070343017578"
                  stitchTiles="stitch"
                  numOctaves="3"
                  result="noise"
                  seed="7729"
                />
                <feColorMatrix in="noise" type="luminanceToAlpha" result="alphaNoise" />
                <feComponentTransfer in="alphaNoise" result="coloredNoise1">
                  <feFuncA
                    type="discrete"
                    tableValues="1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 "
                  />
                </feComponentTransfer>
                <feComposite operator="in" in2="shape" in="coloredNoise1" result="noise1Clipped" />
                <feFlood floodColor="rgba(0, 0, 0, 0.25)" result="color1Flood" />
                <feComposite operator="in" in2="noise1Clipped" in="color1Flood" result="color1" />
                <feMerge result="effect1_noise_733_3088">
                  <feMergeNode in="shape" />
                  <feMergeNode in="color1" />
                </feMerge>
              </filter>
              <linearGradient
                id="paint0_linear_733_3088"
                x1="0.00390625"
                y1="37.0725"
                x2="13.7239"
                y2="37.0725"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#EE6055" />
                <stop offset="1" stopColor="#57C4E5" />
              </linearGradient>
              <linearGradient
                id="paint1_linear_733_3088"
                x1="0.00390625"
                y1="37.0725"
                x2="13.7239"
                y2="37.0725"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#EE6055" />
                <stop offset="1" stopColor="#57C4E5" />
              </linearGradient>
              <linearGradient
                id="paint2_linear_733_3088"
                x1="13.457"
                y1="27.3134"
                x2="-0.00613403"
                y2="27.3134"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#EE6055" />
                <stop offset="1" stopColor="#57C4E5" />
              </linearGradient>
              <linearGradient
                id="paint3_linear_733_3088"
                x1="27.9551"
                y1="37.0725"
                x2="14.2351"
                y2="37.0725"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#57C4E5" stopOpacity="0.6" />
                <stop offset="1" stopColor="#EE6055" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient
                id="paint4_linear_733_3088"
                x1="27.9551"
                y1="37.0725"
                x2="14.2351"
                y2="37.0725"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#57C4E5" stopOpacity="0.6" />
                <stop offset="1" stopColor="#EE6055" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient
                id="paint5_linear_733_3088"
                x1="14.4902"
                y1="27.3134"
                x2="27.9534"
                y2="27.3134"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#57C4E5" stopOpacity="0.6" />
                <stop offset="1" stopColor="#EE6055" stopOpacity="0.6" />
              </linearGradient>
              <clipPath id="clip0_733_3088">
                <rect width="27.96" height="74.145" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </div>

        {/* Start Thinking Mentats Heading (Figma node 733:3312) */}
        <h1 className="font-normal text-[24px] text-[#1e1e1e] dark:text-neutral-100 leading-[1.1] tracking-normal m-0 p-0 select-none">
          Start Thinking Mentats
        </h1>
      </div>

      {/* Floating Composer Card (Figma node 733:3313 / 859:2189 / 859:2339) */}
      <div className="w-full">
        <form
          onSubmit={handleSendMessage}
          className="group relative flex flex-col justify-between h-[124px] rounded-[16px] border-[1.2px] border-[#e5e7eb] dark:border-neutral-800 bg-white dark:bg-neutral-900 p-[16px] gap-[20px] shadow-[0px_4px_4px_rgba(0,0,0,0.03)] transition-all focus-within:border-neutral-400 dark:focus-within:border-neutral-600 focus-within:shadow-md"
        >
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Write a Message"
            rows={2}
            className="w-full resize-none bg-transparent font-medium text-[14px] text-[#111827] dark:text-neutral-100 placeholder:text-[#8e8e93] outline-none leading-normal"
          />

          {/* Bottom Action Row (Figma node 733:3316) */}
          <div className="flex items-center justify-between w-full">
            {/* Attach File (+) Button (Figma node 733:3318) */}
            <button
              type="button"
              className="size-[32px] rounded-full bg-[#ededed] dark:bg-neutral-800 text-[#111827] dark:text-neutral-200 flex items-center justify-center hover:bg-[#e0e0e0] dark:hover:bg-neutral-700 active:scale-95 transition-transform cursor-pointer"
              title="Attach File"
            >
              <Plus className="w-[14px] h-[14px] stroke-[2.2]" />
            </button>

            <div className="flex items-center gap-[10px]">
              {/* Model Dropdown Pill (Figma node 733:3322) */}
              <div className="relative flex items-center px-[10px] py-[6px] rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer select-none">
                <span className="font-medium text-[12px] text-black dark:text-white mr-[4px]">
                  {selectedModel || 'Select Model'}
                </span>
                <ChevronDown className="w-[10px] h-[10px] text-neutral-600 dark:text-neutral-400 stroke-[2.2]" />
                
                {/* Native Accessible Select Overlay */}
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                >
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  {models.length === 0 && (
                    <option value={selectedModel}>{selectedModel}</option>
                  )}
                </select>
              </div>

              {/* Send Button (Figma node 733:3328) */}
              <button
                type="submit"
                disabled={!message.trim() || isSending}
                className="size-[34px] rounded-full bg-[#0f172a] text-white flex items-center justify-center hover:bg-[#1e293b] active:scale-95 transition-all shadow-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Send Message"
              >
                <ArrowUp className="w-[14px] h-[14px] stroke-[2.2]" />
              </button>
            </div>
          </div>
        </form>
      </div>
      </div>
      </div>

      {/* Start Project Modal */}
      <StartProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />

      {/* Coming Soon Modal */}
      <Dialog
        open={comingSoonFeature !== null}
        onOpenChange={(open) => {
          if (!open) setComingSoonFeature(null);
        }}
      >
        <DialogContent className="max-w-sm rounded-2xl p-6 text-center sm:p-7">
          <DialogHeader className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-[rgba(238,96,85,0.15)] to-[rgba(87,196,229,0.18)] text-neutral-800 dark:text-neutral-200">
              <span className="text-xl">✨</span>
            </div>
            <DialogTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 text-center">
              {comingSoonFeature === 'Agents'
                ? 'Agents coming soon'
                : 'Playground coming soon'}
            </DialogTitle>
            <DialogDescription className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
              {comingSoonFeature === 'Agents'
                ? 'Agents coming soon'
                : 'Playground coming soon'}
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
    </div>
  );
}
