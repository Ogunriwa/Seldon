'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';
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

export default function Page() {
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState<string>('');
  const [input, setInput] = useState('');
  const modelRef = useRef('');
  modelRef.current = model;

  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({ model: modelRef.current }),
    }),
  });

  useEffect(() => {
    fetch('/api/models')
      .then((r) => r.json())
      .then((data: { models: string[] }) => {
        setModels(data.models);
        if (data.models[0]) setModel(data.models[0]);
      })
      .catch((e) => console.error('failed to fetch models', e));
  }, []);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status]);

  const submit = () => {
    const text = input.trim();
    if (!text || !model || status !== 'ready') return;
    setInput('');
    sendMessage({ text });
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
        <div className="text-sm font-semibold">Seldon</div>
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
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground">
              {model ? `Chat with ${model}` : 'Pick a model to start.'}
            </div>
          )}
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
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2 px-4 py-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={model ? 'Send a message…' : 'Pick a model first'}
            disabled={!model}
            rows={2}
            className="min-h-[44px] flex-1 resize-none"
          />
          {status === 'streaming' || status === 'submitted' ? (
            <Button type="button" variant="outline" onClick={() => stop()}>
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim() || !model}>
              Send
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

type Message = ReturnType<typeof useChat>['messages'][number];

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const text = message.parts
    .map((p) => (p.type === 'text' ? p.text : ''))
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
        {isUser ? (
          <div className="whitespace-pre-wrap text-sm">{text}</div>
        ) : (
          <Markdown content={text} />
        )}
      </div>
    </div>
  );
}
