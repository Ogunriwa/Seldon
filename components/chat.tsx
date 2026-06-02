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
import { ChevronDown } from 'lucide-react';

type ChatProps = {
  id?: string;
  initialMessages?: UIMessage[];
  initialModel?: string;
  projectId?: string | null;
};

export function Chat({ id, initialMessages, initialModel, projectId: initialProjectId }: ChatProps) {
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState(initialModel ?? '');
  const [conversationId, setConversationId] = useState(id);
  const [input, setInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(initialProjectId ?? null);

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
      }),
    }),
  });

  useEffect(() => {
    fetch('/api/models')
      .then((r) => r.json())
      .then((data: { models: string[] }) => {
        setModels(data.models);
        if (!model && data.models[0]) setModel(data.models[0]);
      })
      .catch((e) => console.error('failed to fetch models', e));
  }, []);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status]);

  const submit = useCallback(async () => {
    const text = input.trim();
    if (!text || !model || status !== 'ready' || creating) return;
    setInput('');

    if (!conversationIdRef.current) {
      setCreating(true);
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, firstMessage: text, projectId: activeProjectId ?? undefined }),
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

    sendMessage({ text });
  }, [input, model, status, creating, sendMessage]);

  const busy = status === 'streaming' || status === 'submitted';
  const isEmpty = messages.length === 0;

  const modelPicker = (
    <Select value={model} onValueChange={(v) => setModel(v as string)}>
      <SelectTrigger className="min-w-48">
        <SelectValue placeholder={models.length ? 'Select model' : 'Loading…'} />
      </SelectTrigger>
      <SelectContent>
        {models.map((m) => (
          <SelectItem key={m} value={m}>
            {m}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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

  if (isEmpty) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <h1 className="mb-8 text-center text-2xl font-medium text-foreground">
            What can I help with?
          </h1>
          <form onSubmit={onSubmit}>
            <div className="rounded-2xl border border-border bg-muted/40 p-4 shadow-sm">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={model ? 'Send a message…' : 'Pick a model first'}
                disabled={!model}
                rows={3}
                className="min-h-[72px] resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center justify-between pt-2">
                {modelPicker}
                <Button type="submit" disabled={!input.trim() || !model || creating}>
                  Send
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
          {messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              isThinking={busy && i === messages.length - 1 && m.role === 'assistant'}
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
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-muted/40 p-4 shadow-sm">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Send a message…"
            rows={2}
            className="min-h-[44px] resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between pt-2">
            {modelPicker}
            {busy ? (
              <Button type="button" variant="outline" onClick={() => stop()}>
                Stop
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim() || !model || creating}>
                Send
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

type MessageType = ReturnType<typeof useChat>['messages'][number];

function MessageBubble({ message, isThinking }: { message: MessageType; isThinking: boolean }) {
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
