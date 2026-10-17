'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Markdown } from '@/components/markdown';
import { StagedFiles, AttachmentBadges, type AttachmentInfo } from '@/components/file-chips';
import { ChevronDown, Paperclip, Plus, ArrowUp, Sparkles, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChatProps = {
  id?: string;
  initialMessages?: UIMessage[];
  initialModel?: string;
  projectId?: string | null;
  projectName?: string | null;
  initialAttachments?: Record<string, AttachmentInfo[]>;
};

type StagedFile = { file: File; id: string };

let fileIdCounter = 0;

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.includes(ext);
}

export function Chat({ id, initialMessages, initialModel, projectId: initialProjectId, projectName, initialAttachments }: ChatProps) {
  // ── State & Refs ────────────────────────────────────────────────
  // Local state for models, conversation ID, inputs, uploading, and active project.
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState(initialModel ?? '');
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [conversationId, setConversationId] = useState(id);
  const [input, setInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(initialProjectId ?? null);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [visionSupported, setVisionSupported] = useState(false);
  const [messageAttachments, setMessageAttachments] = useState<Record<string, AttachmentInfo[]>>(
    initialAttachments ?? {},
  );
  
  // Track pending attachment IDs that need to be linked to a message
  const pendingAttachmentIds = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [input]);

  // ── Project & Chat Init ──────────────────────────────────────────
  // Listen for global project changes if not bound to a specific chat ID
  useEffect(() => {
    if (id) return;
    const handler = (e: Event) => {
      setActiveProjectId((e as CustomEvent).detail ?? null);
    };
    window.addEventListener('project-changed', handler);
    return () => window.removeEventListener('project-changed', handler);
  }, [id]);

  const modelRef = useRef(model);
  modelRef.current = model;
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;

  const chatId = id ?? 'new';
  
  /*
   * ── useChat Integration ────────────────────────────────────────
   * Uses ai-sdk's useChat to handle real-time streaming of messages.
   * → POST /api/chat
   */
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    body: () => ({
      model: modelRef.current,
      conversationId: conversationIdRef.current,
      pendingAttachmentIds: pendingAttachmentIds.current,
    }),
  }), []);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
  });

  /*
   * ── Fetch Models ───────────────────────────────────────────────
   * Retrieves available Ollama models.
   * → GET /api/models
   */
  const fetchModels = useCallback(() => {
    setLoadingModels(true);
    setModelsError(null);
    fetch('/api/models')
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error || `Server returned status ${r.status}`);
        }
        return r.json();
      })
      .then((data: { models: string[] }) => {
        setModels(data.models);
        if (data.models.length === 0) {
          setModelsError('No models found. Please pull a model first.');
        } else {
          // If the model is not set, set it to the first available model
          setModel((current) => {
            if (!current && data.models[0]) {
              return data.models[0];
            }
            return current;
          });
        }
      })
      .catch((e) => {
        console.error('failed to fetch models', e);
        setModelsError(e.message || 'Failed to fetch models. Is Ollama running?');
      })
      .finally(() => {
        setLoadingModels(false);
      });
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    if (!id) return;
    const promptKey = `pending_prompt_${id}`;
    const attachmentsKey = `pending_attachments_${id}`;
    
    const pending = sessionStorage.getItem(promptKey);
    const pendingAttachments = sessionStorage.getItem(attachmentsKey);
    
    if (pending || pendingAttachments) {
      if (pending) sessionStorage.removeItem(promptKey);
      if (pendingAttachments) {
        sessionStorage.removeItem(attachmentsKey);
        try {
          pendingAttachmentIds.current = JSON.parse(pendingAttachments);
        } catch (e) {
          console.error('Failed to parse pending attachments', e);
        }
      }
      sendMessage({ text: pending || '(see attached files)' });
    }
  }, [id, sendMessage]);

  /*
   * ── Detect Vision Capabilities ─────────────────────────────────
   * Checks if the currently selected model supports image inputs.
   * → GET /api/capabilities
   */
  useEffect(() => {
    if (!model) {
      setVisionSupported(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/capabilities?model=${encodeURIComponent(model)}`)
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
  }, [model]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // Tolerance of 100px to still be considered "at bottom"
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages, status]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    // Filter out images if the current model can't see them.
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

    // Reset the input so the same file can be selected again
    e.target.value = '';
  }, [stagedFiles.length, visionSupported]);

  const removeStagedFile = useCallback((id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
    setUploadError(null);
  }, []);

  /*
   * ── Message & File Submission ──────────────────────────────────
   * Handles creating the conversation (if needed), uploading files,
   * and dispatching the message to useChat.
   * -> POST /api/conversations (if new)
   * -> POST /api/upload (if files are attached)
   */
  const submit = useCallback(async () => {
    const text = input.trim();
    if ((!text && stagedFiles.length === 0) || !model || status !== 'ready' || creating || uploading) return;
    setInput('');
    setUploadError(null);

    // Ensure conversation exists
    if (!conversationIdRef.current) {
      setCreating(true);
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, firstMessage: text || '(file upload)', projectId: activeProjectId ?? undefined }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setConversationId(data.id);
        conversationIdRef.current = data.id;
        window.history.replaceState(null, '', `/c/${data.id}`);
        window.dispatchEvent(new CustomEvent('conversation-created'));
      } catch (e) {
        console.error('failed to create conversation', e);
        setInput(text);
        setCreating(false);
        return;
      }
      setCreating(false);
    }

    // Upload files if any
    let uploadedAttachments: AttachmentInfo[] = [];
    if (stagedFiles.length > 0) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('conversationId', conversationIdRef.current!);
        for (const { file } of stagedFiles) {
          formData.append('files', file);
        }
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        uploadedAttachments = data.attachments;
        // Store attachment IDs so the chat API can link them to the message
        pendingAttachmentIds.current = uploadedAttachments.map((a: AttachmentInfo) => a.id);
        setStagedFiles([]);
      } catch (e) {
        console.error('failed to upload files', e);
        setUploadError('Failed to upload files. Please try again.');
        setUploading(false);
        setInput(text);
        return;
      }
      setUploading(false);
    } else {
      pendingAttachmentIds.current = [];
    }

    // Force scroll to bottom on user input
    isAtBottomRef.current = true;

    // Send the message
    sendMessage({ text: text || '(see attached files)' });

    // Optimistically show attachment badges on the next user message
    if (uploadedAttachments.length > 0) {
      // We'll use a temporary key; it gets reconciled when the message appears
      setMessageAttachments((prev) => ({
        ...prev,
        ['__pending__']: uploadedAttachments,
      }));
    }
  }, [input, model, status, creating, uploading, sendMessage, stagedFiles, activeProjectId]);

  // When messages change, reconcile pending attachments with actual message IDs
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'user' && pendingAttachmentIds.current.length > 0) {
      setMessageAttachments((prev) => {
        if (!prev['__pending__']) return prev; // bail out if nothing to reconcile
        const newMap = { ...prev };
        newMap[lastMsg.id] = newMap['__pending__'];
        delete newMap['__pending__'];
        pendingAttachmentIds.current = [];
        return newMap;
      });
    }
  }, [messages]);

  const busy = status === 'streaming' || status === 'submitted';
  const isEmpty = messages.length === 0;
  const hasContent = input.trim() || stagedFiles.length > 0;

  const DOC_TYPES = '.txt,.md,.csv,.json,.pdf,.py,.ts,.js,.jsx,.tsx,.rs,.go,.java,.c,.cpp,.h,.rb,.sh,.yaml,.yml,.toml,.xml,.html,.css,.sql,.log,.env,.ini,.cfg,.conf,.mjs,.cjs,.graphql,.gql,.prisma,.swift,.kt,.scala,.r,.lua,.pl,.php,.ex,.zig,.dart,.makefile,.dockerfile,.hpp,.scss,.bash,.zsh,.fish';
  const IMAGE_TYPES = '.png,.jpg,.jpeg,.webp,.gif';
  const ACCEPTED_TYPES = visionSupported ? `${DOC_TYPES},${IMAGE_TYPES}` : DOC_TYPES;

  // ── Input & Attachment Components ──────────────────────────────
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      accept={ACCEPTED_TYPES}
      onChange={handleFileSelect}
      className="hidden"
    />
  );

  const attachButton = (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={!model || stagedFiles.length >= 5}
      className="bg-[#ededed] dark:bg-neutral-800 flex items-center justify-center rounded-[100px] size-[32px] text-black dark:text-white hover:bg-[#e0e0e0] dark:hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
      title={visionSupported ? 'Attach files or images' : 'Attach files (this model can’t read images)'}
    >
      <Plus className="size-[14px]" />
    </button>
  );

  const modelPicker = (
    <div className="flex items-center gap-[10px]">
      <div className="relative flex items-center gap-[4px] px-[10px] py-[6px] rounded-[100px] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
        <Sparkles className="size-[12px] text-neutral-600 dark:text-neutral-300" />
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={loadingModels || models.length === 0}
          className="appearance-none bg-transparent pr-4 text-[12px] font-medium text-black dark:text-white outline-none cursor-pointer disabled:opacity-50"
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
          className="text-[11px] text-amber-600 hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  const composerContent = (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-[0px_4px_16px_rgba(0,0,0,0.03)] flex flex-col gap-[16px] min-h-[124px] items-start p-[16px] rounded-[16px] w-[768px] max-w-full justify-between transition-all mx-auto">
      <div className="flex flex-col w-full gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 300)}px`;
          }}
          onKeyDown={onKeyDown}
          placeholder={
            loadingModels
              ? 'Loading models…'
              : modelsError
              ? 'Cannot send message: check Ollama connection'
              : model
              ? 'Write a Message'
              : 'Pick a model first'
          }
          disabled={!model || loadingModels}
          rows={isEmpty ? 3 : 1}
          className="w-full resize-none bg-transparent text-[14px] font-medium text-black dark:text-white placeholder:text-[#8e8e93] outline-none border-0 shadow-none focus-visible:ring-0 p-0 max-h-[300px] overflow-y-auto"
        />
        <StagedFiles files={stagedFiles} onRemove={removeStagedFile} />
        {uploadError && (
          <div className="text-xs text-destructive">{uploadError}</div>
        )}
      </div>

      <div className="flex items-end justify-between w-full">
        <div className="flex items-center gap-[8px]">
          {attachButton}
          {activeProjectId && (
            <div className="bg-[#ededed] dark:bg-neutral-800 flex h-[32px] items-center px-[10px] py-[6px] rounded-[100px]">
              <span className="text-[12px] font-medium text-[#111827] dark:text-neutral-100 whitespace-nowrap">
                {projectName || 'Project Workspace'}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-[10px]">
          {modelPicker}
          {busy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="bg-[#0f172a] text-white flex items-center justify-center rounded-[100px] size-[36px] hover:opacity-90 active:scale-95 transition-all"
              title="Stop generating"
            >
              <Square className="size-[12px]" fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!hasContent || !model || creating || uploading}
              className="bg-[#9ca3af] text-white flex items-center justify-center rounded-[100px] size-[36px] hover:bg-[#0f172a] hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: (hasContent && model && !creating && !uploading) ? '#0f172a' : undefined }}
              title="Send Message"
            >
              <ArrowUp className="size-[14px]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ── JSX Return (Empty vs Populated Chat) ────────────────────────
  if (isEmpty) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4">
        {fileInput}
        <div className="w-full max-w-2xl">
          <h1 className="mb-8 text-center text-2xl font-medium text-foreground">
            What can I help with?
          </h1>
          {modelsError && (
            <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
              <div className="flex items-center gap-2 font-medium mb-1.5">
                <span>⚠️ Ollama Connection Issue</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {modelsError}. Please make sure Ollama is running (<code>ollama serve</code>) and that you have downloaded a model (e.g. <code>ollama pull qwen3.5:latest</code>).
              </p>
            </div>
          )}
          <form onSubmit={onSubmit}>
            {composerContent}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {fileInput}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
          {messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              isThinking={busy && i === messages.length - 1 && m.role === 'assistant'}
              attachments={messageAttachments[m.id]}
              isProjectThread={!!activeProjectId}
            />
          ))}
          {status === 'submitted' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
              </span>
              <span>Thinking…</span>
            </div>
          )}
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p className="font-medium mb-1">Failed to get a response</p>
              <p className="text-xs text-destructive/80 leading-relaxed">
                {error.message || 'The model did not return a response. This can happen if the model is too slow, ran out of memory, or is not running.'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Try sending your message again, or switch to a smaller/faster model.
              </p>
            </div>
          )}
        </div>
      </div>

      <form className={cn("shrink-0 px-4 py-3", !activeProjectId && "bg-background")} onSubmit={onSubmit}>
        <div className="mx-auto max-w-3xl">
          {modelsError && (
            <div className="mb-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
              <span className="font-semibold mr-1">⚠️ Connection Issue:</span>
              <span className="text-muted-foreground">{modelsError}</span>
            </div>
          )}
          {composerContent}
        </div>
      </form>
    </div>
  );
}

type MessageType = ReturnType<typeof useChat>['messages'][number];

function MessageBubble({
  message,
  isThinking,
  attachments,
  isProjectThread,
}: {
  message: MessageType;
  isThinking: boolean;
  attachments?: AttachmentInfo[];
  isProjectThread?: boolean;
}) {
  const isUser = message.role === 'user';
  const text = message.parts
    .map((p) => (p.type === 'text' ? p.text : ''))
    .join('');
  const reasoning = message.parts
    .filter((p) => p.type === 'reasoning')
    .map((p) => (p as { type: 'reasoning'; text: string }).text)
    .join('');

  if (isProjectThread) {
    if (isUser) {
      return (
        <div className="flex justify-end w-full mb-2">
          <div className="bg-gradient-to-l from-[rgba(249,241,242,0.51)] to-[#f1f6f9] p-[20px] rounded-[12px] max-w-[85%]">
            {attachments && attachments.length > 0 && (
              <div className="mb-3">
                <AttachmentBadges attachments={attachments} />
              </div>
            )}
            <div className="whitespace-pre-wrap text-[16px] font-medium text-black tracking-[0.64px] leading-normal">
              {text}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex justify-start w-full">
          <div className="p-[20px] w-full text-[16px] font-medium text-black dark:text-white tracking-[0.64px] leading-normal">
            {reasoning && <ThinkingBlock text={reasoning} active={isThinking} />}
            <Markdown content={text} className="text-[16px] text-black dark:text-white tracking-[0.64px] font-medium leading-[normal]" />
          </div>
        </div>
      );
    }
  }

  // Fallback / Quick Chat UI
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          isUser
            ? 'max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-primary-foreground'
            : 'max-w-[85%] rounded-2xl bg-muted px-4 py-2 text-foreground'
        }
      >
        {isUser && attachments && attachments.length > 0 && (
          <AttachmentBadges attachments={attachments} />
        )}
        {!isUser && reasoning && <ThinkingBlock text={reasoning} active={isThinking} />}
        {isUser ? (
          <div className="whitespace-pre-wrap text-sm">{text}</div>
        ) : (
          <Markdown content={text} />
        )}
      </div>
    </div>
  );
}

function ChipIcon({ animate, className }: { animate?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
    >
      <style>{`
        @keyframes signal-flow {
          0% { stroke-dashoffset: 8; }
          100% { stroke-dashoffset: 0; }
        }
        .chip-wire { stroke-dasharray: none; }
        .chip-wire-animate {
          stroke-dasharray: 2 2;
          animation: signal-flow 0.6s linear infinite;
        }
      `}</style>
      {/* Chip body */}
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      {/* Inner die */}
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" strokeWidth="1" />
      {/* Top pins */}
      <line x1="10" y1="3" x2="10" y2="7" className={animate ? 'chip-wire-animate' : 'chip-wire'} />
      <line x1="14" y1="3" x2="14" y2="7" className={animate ? 'chip-wire-animate' : 'chip-wire'} style={{ animationDelay: '0.15s' }} />
      {/* Bottom pins */}
      <line x1="10" y1="17" x2="10" y2="21" className={animate ? 'chip-wire-animate' : 'chip-wire'} style={{ animationDelay: '0.3s' }} />
      <line x1="14" y1="17" x2="14" y2="21" className={animate ? 'chip-wire-animate' : 'chip-wire'} style={{ animationDelay: '0.45s' }} />
      {/* Left pins */}
      <line x1="3" y1="10" x2="7" y2="10" className={animate ? 'chip-wire-animate' : 'chip-wire'} style={{ animationDelay: '0.1s' }} />
      <line x1="3" y1="14" x2="7" y2="14" className={animate ? 'chip-wire-animate' : 'chip-wire'} style={{ animationDelay: '0.25s' }} />
      {/* Right pins */}
      <line x1="17" y1="10" x2="22" y2="10" className={animate ? 'chip-wire-animate' : 'chip-wire'} style={{ animationDelay: '0.4s' }} />
      <line x1="17" y1="14" x2="22" y2="14" className={animate ? 'chip-wire-animate' : 'chip-wire'} style={{ animationDelay: '0.55s' }} />
    </svg>
  );
}

function ThinkingBlock({ text, active }: { text: string; active: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        type="button"
        className="flex items-center gap-2.5 py-1 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <ChipIcon animate={active} className="h-4 w-4" />
        <span className="font-medium">Thinking</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2.5 ml-6.5 text-xs leading-relaxed text-muted-foreground/70 whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  );
}
