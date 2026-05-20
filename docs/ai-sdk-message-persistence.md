# AI SDK v6: Chatbot Message Persistence

> Source: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence
> Bundled copy: `node_modules/ai/docs/04-ai-sdk-ui/03-chatbot-message-persistence.mdx`

---

## Overview

Covers storing and loading chat messages with `useChat` and `streamText`.
Does **not** cover authorization or error handling — just the persistence mechanics.

## Starting a new chat

When the user hits the chat page without a chat ID, create one server-side and redirect:

```tsx
// app/chat/page.tsx
import { redirect } from 'next/navigation';
import { createChat } from '@util/chat-store';

export default async function Page() {
  const id = await createChat();
  redirect(`/chat/${id}`);
}
```

## Loading an existing chat

```tsx
// util/chat-store.ts
import { UIMessage } from 'ai';
import { readFile } from 'fs/promises';

export async function loadChat(id: string): Promise<UIMessage[]> {
  return JSON.parse(await readFile(getChatFile(id), 'utf8'));
}
```

## Displaying the chat (hydrating useChat)

Server component loads messages, passes to client component:

```tsx
// app/chat/[id]/page.tsx
import { loadChat } from '@util/chat-store';
import Chat from '@ui/chat';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const messages = await loadChat(id);
  return <Chat id={id} initialMessages={messages} />;
}
```

Client component:

```tsx
// ui/chat.tsx
'use client';

import { UIMessage, useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export default function Chat({
  id,
  initialMessages,
}: { id?: string; initialMessages?: UIMessage[] } = {}) {
  const [input, setInput] = useState('');
  const { sendMessage, messages } = useChat({
    id,                        // use the provided chat ID
    messages: initialMessages, // hydrate from DB
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          {m.role === 'user' ? 'User: ' : 'AI: '}
          {m.parts
            .map(part => (part.type === 'text' ? part.text : ''))
            .join('')}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

## Storing messages

Use the `onFinish` callback on `toUIMessageStreamResponse()`.
`onFinish` receives the complete `UIMessage[]` including the new assistant response.

```tsx
// app/api/chat/route.ts
import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { saveChat } from '@util/chat-store';

export async function POST(req: Request) {
  const { messages, chatId }: { messages: UIMessage[]; chatId: string } =
    await req.json();

  const result = streamText({
    model: 'openai/gpt-5-mini',
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: ({ messages }) => {
      saveChat({ chatId, messages });
    },
  });
}
```

## Message ID generation

**Client-side** (default): fine for non-persistent apps.
**Server-side** (required for persistence): prevents ID conflicts across sessions.

### Option 1: `generateMessageId` in `toUIMessageStreamResponse`

```tsx
import { createIdGenerator, streamText } from 'ai';

return result.toUIMessageStreamResponse({
  originalMessages: messages,
  generateMessageId: createIdGenerator({
    prefix: 'msg',
    size: 16,
  }),
  onFinish: ({ messages }) => {
    saveChat({ chatId, messages });
  },
});
```

### Option 2: `createUIMessageStream` with custom start part

```tsx
import {
  generateId,
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';

const stream = createUIMessageStream({
  execute: ({ writer }) => {
    writer.write({
      type: 'start',
      messageId: generateId(),
    });

    const result = streamText({
      model: 'openai/gpt-5-mini',
      messages: await convertToModelMessages(messages),
    });

    writer.merge(result.toUIMessageStream({ sendStart: false }));
  },
  originalMessages: messages,
  onFinish: ({ responseMessage }) => {
    // save chat here
  },
});

return createUIMessageStreamResponse({ stream });
```

## Sending only the last message (performance optimization)

Once persistence is in place, send only the latest message instead of full history:

```tsx
// Client — ui/chat.tsx
const { ... } = useChat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest({ messages, id }) {
      return { body: { message: messages[messages.length - 1], id } };
    },
  }),
});
```

```tsx
// Server — app/api/chat/route.ts
export async function POST(req: Request) {
  const { message, id } = await req.json();

  const previousMessages = await loadChat(id);
  const messages = [...previousMessages, message];

  const result = streamText({
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: ({ messages }) => {
      saveChat({ chatId: id, messages });
    },
  });
}
```

## Handling client disconnects

`consumeStream()` removes backpressure so the LLM finishes even if the client drops:

```tsx
const result = streamText({
  model,
  messages: await convertToModelMessages(messages),
});

result.consumeStream(); // no await — fire and forget

return result.toUIMessageStreamResponse({
  originalMessages: messages,
  onFinish: ({ messages }) => {
    saveChat({ chatId, messages });
  },
});
```

## Validating messages from storage

When messages include tool calls, custom metadata, or data parts, validate before processing:

```tsx
import { validateUIMessages } from 'ai';

const validatedMessages = await validateUIMessages({
  messages: [...previousMessages, message],
  tools,
  dataPartsSchema,
  metadataSchema,
});
```

Not needed for Phase 2 (no tools yet), but good to know for later.
