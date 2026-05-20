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

type ChatProps = {
  id?: string;
  initialMessages?: UIMessage[];
  initialModel?: string;
};

export function Chat({ id, initialMessages, initialModel }: ChatProps) {
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState(initialModel ?? '');
  const [conversationId, setConversationId] = useState(id);
  const [input, setInput] = useState('');
  const [creating, setCreating] = useState(false);

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
          body: JSON.stringify({ model, firstMessage: text }),
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
      <header className="flex shrink-0 items-center justify-end border-b border-border px-4 py-2">
        {modelPicker}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
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

      <form
        className="shrink-0 border-t border-border bg-background"
        onSubmit={onSubmit}
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2 px-4 py-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Send a message…"
            rows={2}
            className="min-h-[44px] flex-1 resize-none"
          />
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
      </form>
    </div>
  );
}

type MessageType = ReturnType<typeof useChat>['messages'][number];

function MessageBubble({ message }: { message: MessageType }) {
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
        {!isUser && reasoning && <ThinkingBlock text={reasoning} />}
        {isUser ? (
          <div className="whitespace-pre-wrap text-sm">{text}</div>
        ) : (
          <Markdown content={text} />
        )}
      </div>
    </div>
  );
}

function ThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2 rounded-lg border border-border/60 bg-background/50">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="font-medium">Thinking</span>
        <span className="ml-auto text-[10px]">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-border/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  );
}
