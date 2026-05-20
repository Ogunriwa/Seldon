# AI SDK v6: `useChat()` API Reference

> Source: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
> Bundled copy: `node_modules/ai/docs/07-reference/02-ai-sdk-ui/01-use-chat.mdx`

---

## Import

```tsx
import { useChat } from '@ai-sdk/react';
```

> v5.0+ uses a transport-based architecture and no longer manages input state internally.
> You manage `input` via `useState` yourself.

## Parameters

### Transport

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `transport` | `ChatTransport` | `DefaultChatTransport` | Transport for sending messages |
| `chat` | `Chat<UIMessage>` | — | Existing Chat instance (if provided, other params ignored) |

#### `DefaultChatTransport` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `api` | `string` | `'/api/chat'` | API endpoint |
| `credentials` | `RequestCredentials` | — | Fetch credentials mode |
| `headers` | `Record<string, string> \| Headers` | — | HTTP headers |
| `body` | `object` | — | Extra body properties sent with every request |
| `fetch` | `FetchFunction` | — | Custom fetch implementation |
| `prepareSendMessagesRequest` | `(options) => { body, headers?, ... }` | — | Customize request before API call (e.g. send only last message) |
| `prepareReconnectToStreamRequest` | `(options) => ...` | — | Customize reconnect requests |

### State & identity

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string?` | Unique chat identifier. Random if omitted. |
| `messages` | `UIMessage[]?` | Initial messages (hydrate from DB) |
| `messageMetadataSchema` | `FlexibleSchema?` | Schema for message metadata validation |
| `dataPartSchemas` | `UIDataTypesToSchemas?` | Schemas for data part validation |
| `generateId` | `IdGenerator?` | Custom ID generator for messages |

### Callbacks

| Param | Type | Description |
|-------|------|-------------|
| `onToolCall` | `({toolCall}) => void` | Called when a tool call is received |
| `onFinish` | `(options) => void` | Called when assistant response finishes streaming |
| `onError` | `(error) => void` | Error callback |
| `onData` | `(dataPart) => void` | Called when a data part is received |

#### `onFinish` options

| Field | Type | Description |
|-------|------|-------------|
| `message` | `UIMessage` | The response message |
| `messages` | `UIMessage[]` | All messages including the response |
| `isAbort` | `boolean` | Client aborted the request |
| `isDisconnect` | `boolean` | Server disconnected (e.g. network error) |
| `isError` | `boolean` | Error during streaming stopped response early |
| `finishReason` | `string?` | `'stop'`, `'length'`, `'content-filter'`, `'tool-calls'`, `'error'`, `'other'` |

### Behavior

| Param | Type | Description |
|-------|------|-------------|
| `sendAutomaticallyWhen` | `({messages}) => boolean` | Auto-resubmit condition (e.g. after tool results) |
| `experimental_throttle` | `number?` | Throttle UI updates (ms) |
| `resume` | `boolean?` | Resume ongoing stream on mount |

## Return values

### State

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Chat ID |
| `messages` | `UIMessage[]` | Current messages |
| `status` | `'submitted' \| 'streaming' \| 'ready' \| 'error'` | Current hook status |
| `error` | `Error?` | Error object if status is `'error'` |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `sendMessage` | `(message?, options?) => Promise<void>` | Send a user message. Omit message to resubmit current messages. |
| `regenerate` | `(options?) => Promise<void>` | Regenerate last assistant message (or specific via `messageId`) |
| `stop` | `() => void` | Abort current streaming response |
| `clearError` | `() => void` | Reset error state |
| `resumeStream` | `() => void` | Resume interrupted stream |
| `addToolOutput` | `({tool, toolCallId, output}) => void` | Provide tool result |
| `addToolApprovalResponse` | `({id, approved, reason?}) => void` | Respond to tool approval request |
| `setMessages` | `(msgs \| updater) => void` | Update messages locally (no API call) |

### `sendMessage` message shape

```ts
sendMessage({
  text: string;
  files?: FileList | FileUIPart[];
  metadata?: unknown;
  messageId?: string; // provide to edit/replace an existing message
});
```

## UIMessage shape (what you persist)

```ts
interface UIMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  parts: UIMessagePart[];  // text, tool-call, tool-result, data, etc.
  metadata?: unknown;
}
```

Render via `parts`, not `content`. Parts support multiple types (text, tool invocation, tool result, data).
