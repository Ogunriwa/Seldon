'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowUp, ChevronDown, X } from 'lucide-react';
import { useTabs } from '@/lib/tabs-context';
import { StagedFiles } from '@/components/file-chips';

export type ThreadItem = {
  id: string;
  title: string;
  model: string;
  status: 'active' | 'archived';
  summary?: string | null;
  tags: string | string[];
  createdAt: string | Date;
  updatedAt: string | Date;
};

type StagedFile = { file: File; id: string };
let fileIdCounter = 0;
const isImageFile = (file: File) => file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);

function formatRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) {
    return `${Math.max(2, diffMins)}m ago`;
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function ThreadsTab({
  projectId,
  projectName,
  initialThreads,
}: {
  projectId: string;
  projectName: string;
  initialThreads: ThreadItem[];
}) {
  // ── State & Context ──────────────────────────────────────────
  const [threads, setThreads] = useState<ThreadItem[]>(initialThreads);
  const [message, setMessage] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [visionSupported, setVisionSupported] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { openTab } = useTabs();

  // Sync state if initialThreads or projectId updates
  useEffect(() => {
    setThreads(initialThreads);
  }, [projectId, initialThreads]);

  // Sort threads by updatedAt descending so latest appear first (top rows)
  const sortedThreads = [...threads].sort((a, b) => {
    const dateA = typeof a.updatedAt === 'string' ? new Date(a.updatedAt).getTime() : a.updatedAt.getTime();
    const dateB = typeof b.updatedAt === 'string' ? new Date(b.updatedAt).getTime() : b.updatedAt.getTime();
    return dateB - dateA;
  });

  // ── Effects ──────────────────────────────────────────
  const fetchModels = useCallback(() => {
    setLoadingModels(true);
    setModelsError(null);
    fetch('/api/models')
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as {
          models?: string[];
          error?: string;
        };
        if (!r.ok) {
          setModels([]);
          setSelectedModel('');
          setModelsError(data.error || `Server returned status ${r.status}`);
          return;
        }
        const list = data.models ?? [];
        setModels(list);
        if (list.length === 0) {
          setSelectedModel('');
          setModelsError('No models found. Please pull a model first.');
        } else {
          setSelectedModel((curr) =>
            curr && list.includes(curr) ? curr : list[0],
          );
        }
      })
      .catch(() => {
        setModels([]);
        setSelectedModel('');
        setModelsError('Cannot connect to Ollama on 127.0.0.1:11434 — is Ollama running?');
      })
      .finally(() => {
        setLoadingModels(false);
      });
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    if (!selectedModel) {
      setVisionSupported(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/capabilities?model=${encodeURIComponent(selectedModel)}`)
      .then((r) => r.json())
      .then((data: { vision?: boolean }) => {
        if (!cancelled) setVisionSupported(Boolean(data.vision));
      })
      .catch(() => {
        if (!cancelled) setVisionSupported(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedModel]);

  // ── Handlers ──────────────────────────────────────────
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const incoming = Array.from(selected);
    const blockedImages = visionSupported
      ? []
      : incoming.filter((f) => isImageFile(f));
    const allowed = visionSupported
      ? incoming
      : incoming.filter((f) => !isImageFile(f));

    const currentCount = stagedFiles.length;
    const maxToAdd = 5 - currentCount;
    const newFiles: StagedFile[] = allowed
      .slice(0, maxToAdd)
      .map((file) => ({ file, id: `staged-${++fileIdCounter}` }));

    if (blockedImages.length > 0) {
      setUploadError('The selected model does not support image inputs. Switch to a vision model to attach images.');
    } else if (allowed.length > maxToAdd) {
      setUploadError(`Maximum 5 files per message. ${allowed.length - maxToAdd} file(s) were not added.`);
    } else {
      setUploadError(null);
    }

    setStagedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  }, [stagedFiles.length, visionSupported]);

  const removeStagedFile = useCallback((id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
    setUploadError(null);
  }, []);

  const handleOpenThread = (thread: ThreadItem) => {
    openTab({
      id: `/c/${thread.id}`,
      title: thread.title,
      href: `/c/${thread.id}`,
    });
    router.push(`/c/${thread.id}`);
  };

  const handleSendMessageWithPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if ((!trimmed && stagedFiles.length === 0) || !selectedModel || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmed ? trimmed.slice(0, 40) : 'New Thread',
          model: selectedModel,
        }),
      });

      const data = await res.json();
      if (res.ok && data.id) {
        let uploadedIds: string[] = [];
        
        if (stagedFiles.length > 0) {
          const formData = new FormData();
          stagedFiles.forEach((sf) => formData.append('files', sf.file));
          formData.append('conversationId', data.id);
          
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.attachments) {
              uploadedIds = uploadData.attachments.map((a: any) => a.id);
            }
          } else {
            console.error('Failed to upload files to new thread');
          }
        }
        
        if (trimmed) {
          sessionStorage.setItem(`pending_prompt_${data.id}`, trimmed);
        }
        if (uploadedIds.length > 0) {
          sessionStorage.setItem(`pending_attachments_${data.id}`, JSON.stringify(uploadedIds));
        }

        openTab({
          id: `/c/${data.id}`,
          title: data.title,
          href: `/c/${data.id}`,
        });
        router.push(`/c/${data.id}`);
      }
    } catch (err) {
      console.error('Failed to create thread:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await handleSendMessageWithPrompt(message);
  };

  return (
    <div
      className="bg-white dark:bg-neutral-900 flex flex-1 flex-col gap-[10px] items-start rounded-[17px] w-full h-full min-h-0"
      data-node-id="860:5518"
    >
      {/* 1. Threads List Stack (Figma Nodes 860:5519 Desktop, 860:6429 768px Open, 860:6306 768px Closed) */}
      {threads.length === 0 ? (
        <div
          className="flex flex-1 flex-col items-center justify-center w-full min-h-[260px] p-8 text-center select-none"
          data-node-id="860:5519"
        >
          <div className="flex flex-col items-center max-w-sm gap-2">
            <h4 className="text-[15px] font-medium text-neutral-800 dark:text-neutral-200">
              No threads yet
            </h4>
            <p className="text-[13px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
              Start a new conversation below to create the first thread for this project.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-1 flex-col gap-[20px] items-start px-[20px] py-[24px] xl:py-[40px] rounded-bl-[10px] rounded-br-[10px] rounded-tr-[10px] w-full overflow-y-auto no-scrollbar min-h-0"
          data-node-id="860:5519"
        >
          {sortedThreads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => handleOpenThread(thread)}
              className="bg-white dark:bg-neutral-900 border-[#bdbfc8] dark:border-neutral-700 border-[0.5px] border-solid drop-shadow-[0px_4px_3px_rgba(0,0,0,0.02)] flex flex-col gap-[16px] items-start p-[24px] xl:p-[16px] rounded-[16px] shrink-0 w-full cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-500 transition-all select-none"
              data-name="masonry-card-1"
            >
              {/* Status & Relative Time */}
              <div className="flex items-start justify-between w-full">
                <div className="flex gap-[6px] items-center">
                  <span className="size-[6px] rounded-full bg-[#10b981]" />
                  <span className="text-[11px] font-normal uppercase text-[#9ca3af] leading-normal whitespace-nowrap">
                    {thread.status || 'Active'}
                  </span>
                </div>
                <span className="text-[11px] font-normal text-[#9ca3af] leading-normal whitespace-nowrap">
                  {formatRelativeTime(thread.updatedAt)}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-[16px] font-semibold text-[#111827] dark:text-neutral-100 leading-normal w-full m-0">
                {thread.title}
              </h3>

              {/* Summary */}
              {thread.summary ? (
                <p className="text-[13px] font-normal leading-[1.5] text-[#4b5563] dark:text-neutral-300 w-full m-0">
                  {thread.summary}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* 2. Thread Chat UI (Figma Nodes 860:5529 Desktop, 860:6455 768px Open, 860:6332 768px Closed) */}
      <div
        className="bg-white dark:bg-neutral-900 flex items-end justify-center p-[10px] w-full shrink-0 mt-auto rounded-b-[17px]"
        data-node-id="860:5529"
      >
        <div
          className="rounded-[16px] p-[1.2px] bg-gradient-to-r from-[#EE6055]/35 to-[#57C4E5]/40 drop-shadow-[0px_4px_4px_rgba(0,0,0,0.03)] w-full xl:w-[768px] max-w-full"
          data-node-id="687:1458"
        >
          <form
            onSubmit={handleSendMessage}
            className="bg-white dark:bg-neutral-900 flex flex-col gap-[20px] min-h-[121.6px] items-start p-[16px] rounded-[14.8px] w-full justify-between transition-all"
          >
            {/* Top Row: Write a message input */}
            <div className="flex flex-col w-full">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  modelsError
                    ? 'Cannot send message: check Ollama connection'
                    : 'Write a Message'
                }
                disabled={!selectedModel || loadingModels}
                rows={1}
                className="w-full resize-none bg-transparent text-[14px] font-medium text-black dark:text-white placeholder:text-[#8e8e93] outline-none"
              />
              <StagedFiles files={stagedFiles} onRemove={removeStagedFile} />
              {uploadError && (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400">
                  <span>{uploadError}</span>
                  <button type="button" onClick={() => setUploadError(null)} className="ml-auto hover:opacity-70">
                    <X className="size-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Row: Controls */}
            <div className="flex items-end justify-between w-full">
              {/* Left: + and Project Pill */}
              <div className="flex items-center gap-[8px]">
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                  title="Select files"
                  accept=".txt,.pdf,.md,.csv,.json,image/*"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!selectedModel || stagedFiles.length >= 5 || isSending}
                  className="bg-[#ededed] dark:bg-neutral-800 flex items-center justify-center rounded-[100px] size-[32px] text-black dark:text-white hover:bg-[#e0e0e0] dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 shrink-0"
                  title={visionSupported ? 'Attach files or images' : 'Attach files (this model can’t read images)'}
                >
                  <Plus className="size-[14px]" />
                </button>

                <div className="bg-[#ededed] dark:bg-neutral-800 flex h-[32px] items-center px-[10px] py-[6px] rounded-[100px]">
                  <span className="text-[12px] font-medium text-[#111827] dark:text-neutral-100 whitespace-nowrap">
                    {projectName}
                  </span>
                </div>
              </div>

              {/* Right: Model Selector & Send Button */}
              <div className="flex items-center gap-[10px]">
                <div
                  className="relative flex items-center gap-[4px] px-[10px] py-[6px] rounded-[100px] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  title={modelsError || undefined}
                >
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={loadingModels || models.length === 0}
                    className="appearance-none bg-transparent pr-4 text-[12px] font-medium text-black dark:text-white outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {models.map((m) => (
                      <option key={m} value={m} className="text-black">
                        {m}
                      </option>
                    ))}
                    {models.length === 0 && (
                      <option value="" className="text-black">
                        {loadingModels ? 'Loading...' : 'No models'}
                      </option>
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1 size-[10px] text-neutral-500" />
                </div>
                {(modelsError || models.length === 0) && !loadingModels && (
                  <button
                    type="button"
                    onClick={fetchModels}
                    className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Retry
                  </button>
                )}

                <button
                  type="submit"
                  disabled={(!message.trim() && stagedFiles.length === 0) || !selectedModel || isSending}
                  className="bg-[#0f172a] text-white flex items-center justify-center rounded-[100px] p-[10px] hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Send Message"
                >
                  <ArrowUp className="size-[14px]" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
