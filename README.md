# Seldon

A self-hosted web UI for [Ollama](https://ollama.com). Personal-scale, single-user, localhost-only.

Built with Next.js 16, the Vercel AI SDK, Tailwind v4, and shadcn/ui.

## Requirements

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) (`brew install pnpm`)
- [Ollama](https://ollama.com/) running on `localhost:11434` with at least one model pulled

Verify Ollama is reachable and has models:

```bash
curl http://localhost:11434/api/tags
```

If you don't have a model yet, pull one:

```bash
ollama pull llama3.2
```

## Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), pick a model from the header dropdown, and chat.

## Build

```bash
pnpm build
pnpm start
```

## Layout

```
app/
  api/chat/      → streams responses from Ollama via streamText()
  api/models/    → proxies Ollama's /api/tags
  page.tsx       → chat UI (useChat, model picker, composer)
components/
  ui/            → shadcn primitives
  markdown.tsx   → react-markdown + remark-gfm + rehype-highlight
lib/utils.ts     → cn() helper
```

## Status

Phase 1 (MVP chat) is done. No persistence yet — refreshing the page clears the conversation. Phase 2 (SQLite + conversation history) is next. See [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md).
