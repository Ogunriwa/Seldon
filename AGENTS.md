<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:learning-and-building-rule -->
# Learning & Building
The user is using this project for both learning and building. When resolving ANY bug in ANY programming language or framework within this codebase, you MUST provide an absolute, detailed explanation. 

- For Tailwind CSS: list every single Tailwind class on the element being discussed, explain what each class means, and show its exact CSS equivalent.
- For other languages (TypeScript, React, SQL, etc.): provide a line-by-line breakdown of the code involved in the bug and the fix. Explain exactly what the code is doing under the hood, why the original code failed, and why the new code fixes it.
<!-- END:learning-and-building-rule -->

<!-- BEGIN:seldon-architecture-guardrails -->
# Seldon System Invariants & Architecture Pointers

- **Application Purpose:** Seldon is a single-user, local-first web UI for Ollama (`localhost:11434`). Do NOT add authentication, cloud providers, or multi-tenant abstractions.
- **Tech Stack:** Next.js 16 (App Router + Turbopack), React 19, Tailwind CSS v4, Vercel AI SDK (`ai` v6, `@ai-sdk/react` v3), SQLite (`better-sqlite3`) + Drizzle ORM.
- **Master Documentation:** For full domain models, entity diagrams, and context budgeting mathematics, ALWAYS read `docs/ARCHITECTURE.md`. For the latest session handoff, ALWAYS read `docs/SESSION_HANDOFF.md`.
- **Non-Negotiable Architecture Rules:**
  1. **Sandwich Prompting:** Never dump document text into the system prompt. Always isolate reference documents in `<document>` XML tags inside a leading user message (see `lib/chat/context/assemble.ts`).
  2. **Message Persistence:** Always pass `generateMessageId: generateId` in `toUIMessageStreamResponse()` to maintain strict ID synchronization between client React state and SQLite.
  3. **Transport Stability:** Always memoize `DefaultChatTransport` with `useMemo` in client components to prevent infinite streaming re-renders.
  4. **Database Safety:** Schema changes must go through `pnpm db:generate` and `pnpm db:migrate`. Never mutate the SQLite file directly.
<!-- END:seldon-architecture-guardrails -->
