'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { useEffect, useRef, useState, useCallback } from 'react';
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
import { ChevronDown, Paperclip } from 'lucide-react';

type ChatProps = {
  id?: string;
  initialMessages?: UIMessage[];
  initialModel?: string;
  projectId?: string | null;
  initialAttachments?: Record<string, AttachmentInfo[]>;
};

type StagedFile = { file: File; id: string };

let fileIdCounter = 0;

export function Chat({ id, initialMessages, initialModel, projectId: initialProjectId, initialAttachments }: ChatProps) {
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
  const [messageAttachments, setMessageAttachments] = useState<Record<string, AttachmentInfo[]>>(
    initialAttachments ?? {},
  );
  // Track pending attachment IDs that need to be linked to a message
  const pendingAttachmentIds = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  const { messages, sendMessage, status, stop, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({
        model: modelRef.current,
        conversationId: conversationIdRef.current,
        pendingAttachmentIds: pendingAttachmentIds.current,
      }),
    }),
  });

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

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: StagedFile[] = [];
    const currentCount = stagedFiles.length;
    const maxToAdd = 5 - currentCount;

    for (let i = 0; i < Math.min(selected.length, maxToAdd); i++) {
      newFiles.push({ file: selected[i], id: `staged-${++fileIdCounter}` });
    }

    if (selected.length > maxToAdd) {
      setUploadError(`Maximum 5 files per message. ${selected.length - maxToAdd} file(s) were not added.`);
    } else {
      setUploadError(null);
    }

    setStagedFiles((prev) => [...prev, ...newFiles]);

    // Reset the input so the same file can be selected again
    e.target.value = '';
  }, [stagedFiles.length]);

  const removeStagedFile = useCallback((id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
    setUploadError(null);
  }, []);

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
    setMessageAttachments((prev) => {
      if (!prev['__pending__']) return prev;
      // Find the latest user message that doesn't already have attachments
      const lastUserMsg = [...messages].reverse().find(
        (m) => m.role === 'user' && !prev[m.id],
      );
      if (lastUserMsg) {
        const { __pending__, ...rest } = prev;
        return { ...rest, [lastUserMsg.id]: __pending__ };
      }
      return prev;
    });
  }, [messages]);

  const busy = status === 'streaming' || status === 'submitted';
  const isEmpty = messages.length === 0;
  const hasContent = input.trim() || stagedFiles.length > 0;

  const ACCEPTED_TYPES = '.txt,.md,.csv,.json,.pdf,.py,.ts,.js,.jsx,.tsx,.rs,.go,.java,.c,.cpp,.h,.rb,.sh,.yaml,.yml,.toml,.xml,.html,.css,.sql,.log,.env,.ini,.cfg,.conf,.mjs,.cjs,.graphql,.gql,.prisma,.swift,.kt,.scala,.r,.lua,.pl,.php,.ex,.zig,.dart,.makefile,.dockerfile,.hpp,.scss,.bash,.zsh,.fish';

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
      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      title="Attach files"
    >
      <Paperclip className="h-4 w-4" />
    </button>
  );

  const modelPicker = (
    <div className="flex items-center gap-2">
      <Select value={model} onValueChange={(v) => setModel(v as string)} disabled={loadingModels || models.length === 0}>
        <SelectTrigger className="min-w-48">
          <SelectValue placeholder={loadingModels ? 'Loading models…' : models.length ? 'Select model' : 'No models available'} />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(modelsError || models.length === 0) && !loadingModels && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchModels}
          className="h-8 px-2 text-xs border-dashed text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
        >
          Retry
        </Button>
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
    <>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          loadingModels
            ? 'Loading models…'
            : modelsError
            ? 'Cannot send message: check Ollama connection'
            : model
            ? 'Send a message…'
            : 'Pick a model first'
        }
        disabled={!model || loadingModels}
        rows={isEmpty ? 3 : 2}
        className={`${isEmpty ? 'min-h-[72px]' : 'min-h-[44px]'} resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0`}
      />
      <StagedFiles files={stagedFiles} onRemove={removeStagedFile} />
      {uploadError && (
        <div className="px-1 pt-1 text-xs text-destructive">{uploadError}</div>
      )}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          {modelPicker}
          {attachButton}
        </div>
        {busy ? (
          <Button type="button" variant="outline" onClick={() => stop()}>
            Stop
          </Button>
        ) : (
          <Button type="submit" disabled={!hasContent || !model || creating || uploading}>
            {uploading ? 'Uploading…' : 'Send'}
          </Button>
        )}
      </div>
    </>
  );

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
            <div className="rounded-2xl border border-border bg-muted/40 p-4 shadow-sm">
              {composerContent}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {fileInput}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
          {messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              isThinking={busy && i === messages.length - 1 && m.role === 'assistant'}
              attachments={messageAttachments[m.id]}
            />
          ))}
          {status === 'submitted' && (
            <div className="text-sm text-muted-foreground">…</div>
          )}
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Something went wrong. Check the dev console.
            </div>
          )}
        </div>
      </div>

      <form className="shrink-0 bg-background px-4 py-3" onSubmit={onSubmit}>
        <div className="mx-auto max-w-3xl">
          {modelsError && (
            <div className="mb-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
              <span className="font-semibold mr-1">⚠️ Connection Issue:</span>
              <span className="text-muted-foreground">{modelsError}</span>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-muted/40 p-4 shadow-sm">
            {composerContent}
          </div>
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
}: {
  message: MessageType;
  isThinking: boolean;
  attachments?: AttachmentInfo[];
}) {
  const isUser = message.role === 'user';
  const text = message.parts
    .map((p) => (p.type === 'text' ? p.text : ''))
    .join('');
  const reasoning = message.parts
    .filter((p) => p.type === 'reasoning')
    .map((p) => (p as { type: 'reasoning'; text: string }).text)
    .join('');

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
