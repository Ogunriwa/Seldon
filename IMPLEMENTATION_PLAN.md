# Implementation Plan

> **Working name:** none yet — pick one after Phase 2. Premature naming wastes energy.

## Goal

A self-hosted web UI for Ollama, built minimally and well, that I iterate on after using it. Phase 1 and Phase 2 are the whole plan that matters right now. Everything past that is "live with it for a week, then decide."

## What this is NOT

- ❌ A platform, a clone of Open WebUI, or a multi-user product
- ❌ A pre-designed extensible framework for "future AI protocols"
- ❌ A project that needs more than Ollama + SQLite + a browser to run

Things like MCP, MCP UI, multi-provider support, RAG, etc. are **candidate iterations**, not architectural commitments. They get added when I want them, designed against the real shape of the code at that point.

## Tech Stack (only what Phase 1 + Phase 2 need)

- **Next.js 15 (App Router) + TypeScript** — single project for UI and API. Next.js routes proxy the browser to Ollama so we don't fight CORS or localhost issues.
- **Vercel AI SDK (`ai`) + `ollama-ai-provider`** — handles streaming, message state, and the `useChat()` hook. Saves a few hundred lines of SSE plumbing.
- **Tailwind v4 + shadcn/ui** — utility CSS plus copy-paste components I own (not a dependency). Free to rewrite anything.
- **`react-markdown` + `rehype-highlight` + `remark-gfm`** — markdown rendering with code blocks and GFM tables.
- **Drizzle ORM + `better-sqlite3`** *(Phase 2 only)* — TypeScript-first ORM, file-based DB. Zero ops.
- **`zod`** *(Phase 2 only)* — validate API inputs.

**Deliberately not included:** Zustand, TanStack Query, Biome, NextAuth, anything MCP-related. Add them when there's a concrete reason. React's `useState`, ESLint's defaults, and `fetch` are fine until they aren't.

---

## Phase 1 — MVP Chat (Day 1)

### Setup

```bash
pnpm create next-app@latest my-ui --typescript --tailwind --app --turbopack
cd my-ui
pnpm add ai ollama-ai-provider react-markdown rehype-highlight remark-gfm
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input textarea scroll-area select
```

### Tasks

- [ ] `app/api/chat/route.ts` — POST handler that calls `streamText({ model: ollama(modelName), messages })` and returns `result.toDataStreamResponse()`. Point `createOllama` at `http://localhost:11434/api`.
- [ ] `app/api/models/route.ts` — GET handler that fetches `http://localhost:11434/api/tags` and returns the model list.
- [ ] `app/page.tsx` — `'use client'` page using `useChat()`. Renders messages, composer textarea, submit button.
- [ ] `components/markdown.tsx` — wraps `react-markdown` with the rehype/remark plugins and code-block styling.
- [ ] Header with a model picker `<Select>` populated from `/api/models`. Pass selected model into `useChat`'s body.
- [ ] Basic layout: header, scrollable message area, composer pinned to bottom. Tailwind only.

### Exit criteria (must all be true to call Phase 1 done)

1. Pick a model from the dropdown and send a message.
2. Response streams in token-by-token, not as one blob.
3. Markdown renders: headers, lists, bold/italic, links.
4. Code blocks have syntax highlighting.
5. Refreshing the page clears the chat (no persistence yet — that's intentional).

### What to deliberately skip

- No conversation list. No sidebar. No "new chat" button.
- No settings page. No theming. Default light mode is fine.
- No error states beyond `console.error`. We'll fix them when we hit them.

---

## Phase 2 — Persistence (Day 2)

### Setup additions

```bash
pnpm add drizzle-orm better-sqlite3 zod
pnpm add -D drizzle-kit @types/better-sqlite3
```

Add to `.gitignore`: `data/`

### Schema (start with this — extend only if needed)

```ts
// lib/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  model: text('model').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### Tasks

- [ ] `lib/db/client.ts` — singleton Drizzle client pointing at `data/app.db`.
- [ ] `drizzle.config.ts` + `pnpm db:generate` + `pnpm db:migrate` to scaffold the DB.
- [ ] `app/api/conversations/route.ts` — `GET` (list) and `POST` (create).
- [ ] `app/api/conversations/[id]/route.ts` — `GET` (with messages), `PATCH` (rename), `DELETE`.
- [ ] In `/api/chat`, on success: upsert the user message, then save the assistant message after streaming completes. Use the AI SDK's `onFinish` callback.
- [ ] URL routing: `/c/[id]` shows that conversation. Root `/` shows the most recent or a fresh chat.
- [ ] Sidebar: list conversations from `/api/conversations`, "New chat" button, click to switch, right-click or menu for rename/delete.
- [ ] On loading a conversation, pass `initialMessages` to `useChat()` so the chat hydrates from DB.
- [ ] Auto-title conversations: after the first turn, generate a title from the first user message (either with a small LLM call or just truncate to 40 chars).

### Exit criteria

1. Conversations survive a full browser restart and a `pnpm dev` restart.
2. Switching between conversations is fast and shows the right history.
3. Rename and delete work.
4. New chats don't get persisted until the first message is sent (no empty rows).

### What to deliberately skip

- No search across conversations yet.
- No folders/tags yet.
- No export yet.
- No multi-user / auth.

---

## Stop. Use it for a week.

This is the most important step in the plan, and the easiest to skip.

The point of building your own is to have something you actually want to use. You can't know what that is from a planning doc — you find out by living with the MVP and noticing what irritates you. Keep a `notes.md` open and jot down friction points:

- "I wish I could pin this conversation"
- "The model picker is annoying when I switch between two models constantly"
- "I want a way to re-run the last response with a different model"
- "Code blocks should have a copy button"
- "I need to feed it a file"

After a week, that list is your real Phase 3 — and it'll be different from what either of us would have predicted.

---

## Iteration principles (after Phase 2)

When you come back to add things, follow these rules so the codebase doesn't rot:

1. **Build the feature concretely first.** Don't generalize on speculation. If you add a second LLM provider, write it the dumb way alongside Ollama. Refactor to an abstraction only once you can see the duplication.
2. **One new dependency per feature, max.** If a feature wants three libraries, the feature is probably two features.
3. **Schema changes go through a migration.** Never edit the DB directly. Run `db:generate` for every change to `schema.ts`.
4. **Resist the settings page.** Every toggle is a permanent maintenance cost. Hardcode aggressive defaults; add a setting only when you find yourself wanting both behaviors.
5. **Keep `app/page.tsx` small.** When it grows past ~150 lines, extract.

---

## Notes on MCP / MCP UI / other protocols (not now, but where they'd go)

When the time comes:

- **Adding tool calling (any flavor)**: extend `/api/chat` to pass `tools` into `streamText`. The AI SDK handles the loop. Whether the tools come from MCP, a hardcoded JS object, or anywhere else is just where the tools array gets sourced from.
- **MCP client**: `@modelcontextprotocol/sdk` connects, lists, invokes. A `lib/mcp.ts` module that exports `getMcpTools()` is plenty until proven otherwise.
- **MCP UI / MCP Apps**: when a tool result has `_meta.ui.resourceUri`, render with `@mcp-ui/client`'s `<UIResourceRenderer />`. Sandbox is handled by the library.
- **Other providers**: the `ai` SDK already abstracts the model — `ollama(name)` swaps for `openai(name)` or `anthropic(name)` with no surrounding code changes.

The point: none of this requires re-architecting. Each is additive. That's the architecture — keep things additive, not "extensible."

---

## Open decisions (only when relevant)

- Project name (after Phase 2, not before)
- Theme support (after the first time the default annoys you)
- Whether to deploy beyond localhost (not Phase 1 or 2's problem)
