# Claude Code Instructions

> Detailed plan in `@IMPLEMENTATION_PLAN.md`. Read it on first session of any new feature.

## What this is

Self-hosted web UI for Ollama. Personal-scale. Building Phase 1 (chat) and Phase 2 (persistence) first, then iterating based on actual usage. No grand architectural ambitions — keep it simple, keep it concrete.

## Stack (current)

- Next.js 15 + App Router + TypeScript
- Vercel AI SDK (`ai`) + `ollama-ai-provider`
- Tailwind v4 + shadcn/ui
- `react-markdown` + `rehype-highlight` + `remark-gfm`
- Drizzle ORM + SQLite (`better-sqlite3`) — *Phase 2 onward*
- `zod` — *Phase 2 onward*
- pnpm

If a feature seems to need another dependency, justify it before installing. Most features don't.

## Layout

```
app/         → Next.js pages and route handlers
  api/       → backend routes
  c/[id]/    → conversation view
components/
  ui/        → shadcn primitives (we own these files)
  ...        → everything else, organized by feature
lib/
  db/        → Drizzle schema, client, migrations (Phase 2+)
data/        → SQLite file (gitignored)
```

Files go in obvious places. No `lib/protocols/` or other speculative folders until they're needed.

## Commands

```bash
pnpm dev              # Next.js dev server
pnpm build            # production build
pnpm db:generate      # Drizzle: generate migration from schema (Phase 2+)
pnpm db:migrate       # Drizzle: apply migrations to data/app.db (Phase 2+)
```

Ollama must be running on `localhost:11434` for chat to work. Test with `curl http://localhost:11434/api/tags`.

## Conventions

- **Imports:** absolute via `@/` alias (e.g., `@/lib/db/client`)
- **Indentation:** 2 spaces
- **Naming:** `kebab-case.tsx` for files, `PascalCase` for components, `camelCase` for functions
- **Server components by default.** Add `'use client'` only when interactivity demands it.
- **All API inputs validated with zod** (once Phase 2 starts).
- **Schema changes go through migrations.** Never edit the DB directly.

## What to do / not do

- ✅ Match the scope of the current phase. If we're in Phase 1, don't add Phase 3 scaffolding "for later."
- ✅ When a component file grows past ~150 lines, extract.
- ✅ Read `@IMPLEMENTATION_PLAN.md` before suggesting architectural changes.
- ❌ Don't add abstractions until there's a second concrete case forcing one. No premature `interface ModelProvider`, no `lib/protocols/`.
- ❌ Don't add settings/toggles unless I'm currently switching between behaviors.
- ❌ Don't suggest deployment, multi-user, or auth concerns. Single-user localhost is the target.
- ❌ Don't add MCP, RAG, or other protocols on your own initiative. Those come when I ask.

## Current phase

Pre-Phase-1. No code yet.
