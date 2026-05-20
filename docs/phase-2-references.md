# Phase 2 References & Critical Notes

Pre-reading collected before starting Phase 2 (persistence).

---

## Links

- **Chatbot Message Persistence guide** — https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence
  Patterns for `initialMessages`, `id`, `prepareSendMessagesRequest`, `onFinish`, and server-side message ID generation. Primary reference for Phase 2.
  Local copy: [`docs/ai-sdk-message-persistence.md`](ai-sdk-message-persistence.md)

- **useChat API reference** — https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
  Full options and return values for the hook.
  Local copy: [`docs/ai-sdk-use-chat-reference.md`](ai-sdk-use-chat-reference.md)

- **assistant-ui v6 page** — https://www.assistant-ui.com/docs/runtimes/ai-sdk/v6
  Not used directly. Keep for the "Key changes from v5" table near the bottom — documents `convertToModelMessages` becoming async, `inputSchema` for tools, and `toUIMessageStreamResponse()` rename.

---

## Critical: UIMessage vs ModelMessage

The AI SDK has two distinct message shapes:

| Shape | Where it lives | What it's for |
|-------|---------------|---------------|
| **`UIMessage`** | Client (useChat), database | Has `parts` array, tool invocations, metadata. This is what you **persist** and what `useChat` expects as `initialMessages`. |
| **`ModelMessage`** | Server only, ephemeral | Flattened format sent to the LLM. Created via `await convertToModelMessages(uiMessages)` in the route handler. |

**The rule:** store `UIMessage[]` in SQLite. Convert to `ModelMessage` only at the moment you call `streamText`. Never persist `ModelMessage` and feed it back as `initialMessages` — that causes rendering bugs (documented GitHub issue).

---

## Key patterns for Phase 2

1. **`useChat({ id, messages: initialMessages })`** — `id` ties the hook to a conversation; `messages` hydrates it from DB on load.

2. **`toUIMessageStreamResponse({ originalMessages, onFinish })`** — `onFinish` receives the full `UIMessage[]` (including the new assistant reply) for saving. Pass `originalMessages` so the SDK can compute the diff.

3. **`prepareSendMessagesRequest`** — once persistence is in, send only the last message to `/api/chat`. Server loads previous messages from DB and appends. Saves bandwidth.

4. **`result.consumeStream()`** — call (without await) before returning the response. Ensures streaming finishes even if the client disconnects, so `onFinish` fires and the message is saved.

5. **Server-side message IDs** — use `generateMessageId` in `toUIMessageStreamResponse` for consistent IDs. Client-side IDs are fine without persistence; with it, server generates to avoid conflicts.

6. **`convertToModelMessages` is async in v6** — must `await` it. (Already done in our Phase 1 route handler.)
