# Seldon

A self-hosted web UI for [Ollama](https://ollama.com). Chat with local LLMs, organize conversations into projects with custom instructions, and view model reasoning/thinking.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Ollama](https://ollama.com) running locally on port 11434

Verify Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

Pull at least one model:

```bash
ollama pull llama3.2
```

## Setup

```bash
# Clone the repo
git clone https://github.com/Ogunriwa/Seldon.git
cd Seldon

# Install dependencies
pnpm install

# Run database migrations (creates data/app.db)
pnpm db:migrate

# Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Chat** with any model pulled in Ollama
- **Conversations** are persisted to a local SQLite database
- **Projects** group conversations and attach custom system instructions
- **Thinking/reasoning** display for models that support it (e.g. deepseek-r1, qwen3)
- **Collapsible sidebar** with recent conversations and project navigation

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm db:generate` | Generate a new migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |

## Stack

- Next.js 16 + App Router + TypeScript
- Vercel AI SDK + ollama-ai-provider
- Tailwind v4 + shadcn/ui
- Drizzle ORM + SQLite (better-sqlite3)
- react-markdown + rehype-highlight + remark-gfm

## License

MIT
