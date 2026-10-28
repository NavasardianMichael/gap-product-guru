# Gap Product Guru

Ask questions about the product and get answers grounded in its official Markdown documentation —
with numbered sources — built entirely on free tiers (Gemini API free tier + local Postgres).

## Features

- **Retrieval-Augmented Generation** over a large (>700k words) Markdown corpus: heading-aware chunks,
  `gemini-embedding-2` vectors in pgvector, `gemini-3.8-flash` answers that cite `[n]` sources.
- **Streaming answers** over Server-Sent Events with live status ("Searching the documentation…",
  "Writing the answer…") and a Stop button.
- **Conversation history** per browser (no login), follow-up questions, deletable conversations.
- **Markdown rendering** with GitHub-flavoured tables and highlighted, copyable code blocks.
- **Free-tier aware**: resumable ingestion, rate-limit countdowns, clear daily-quota messages.

## Monorepo Structure

```
gap-product-guru/
├── client/          # React 19 + Vite + antd 6 + Tailwind 4 chat UI
├── server/          # Express 5 API, ingest CLI, Prisma 7 schema + migrations
├── shared/          # Types, zod schemas and constants used by both
├── data/docs/       # Clone of the product wiki, managed by `pnpm docs:pull` (gitignored)
├── docs/            # Architecture and decision docs (start with ARCHITECTURE.md)
├── docker-compose.yml
└── CLAUDE.md        # Conventions + doc router for Claude Code
```

## Tech Stack

### Client

React 19, TypeScript, Vite 7, Ant Design 6, Tailwind CSS 4 (+ typography plugin), Zustand 5,
React Router 7, react-markdown + remark-gfm + rehype-highlight.

### Server

Node 24, Express 5, TypeScript (ESM), Prisma 7 with `@prisma/adapter-pg`, PostgreSQL 17 + pgvector,
`@google/genai`, zod 4, pino, helmet, express-rate-limit, vitest.

### Shared

TypeScript + zod 4, consumed as the workspace package `@gap-product-guru/shared`.

## Getting Started

### Prerequisites

- Node.js 24+ and pnpm (the repo pins `pnpm@11.3.0`; any pnpm ≥ 10 switches to it automatically)
- Docker (for Postgres + pgvector)
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- Git with read access to the `GAP-International.wiki` repo in Azure DevOps

### Installation

```bash
pnpm install                                         # also generates the Prisma client
cp server/.env.example server/.env.development.local # then set GEMINI_API_KEY (and PRODUCT_NAME)
```

### Docker Services

```bash
docker compose up -d   # Postgres 17 + pgvector on localhost:5435 (user/password/db: guru/guru/gap_product_guru)
```

Override the defaults by copying `.env.example` to `.env` in the repo root.

### Database Setup

```bash
pnpm db:migrate        # creates the vector extension and all tables
```

### Load the documentation

```bash
pnpm docs:pull         # clone the wiki into data/docs/ (later runs: git pull)
pnpm ingest:dry        # optional: chunk stats, no API calls
pnpm ingest            # embeds everything; safe to re-run, resumes where it stopped
```

After the wiki changes, `pnpm docs:sync` does both steps; only new or edited pages are re-embedded.
On the free tier a large corpus may need more than one day of embedding quota — just run
`pnpm ingest` again later. See [docs/INGESTION.md](docs/INGESTION.md).

### Development

```bash
pnpm dev               # http://localhost:7005 (client) → proxies /api to http://localhost:9005
```

### Production Build

```bash
cp server/.env.example server/.env.production.local   # set NODE_ENV=production + your values
pnpm build
pnpm start             # one server on PORT (default 9005) serves the client and /api
```

## Scripts

| Script                                  | What it does                                                 |
| --------------------------------------- | ------------------------------------------------------------ |
| `pnpm dev`                              | Build shared, run client (7005) and server (9005) with watch |
| `pnpm build` / `pnpm start`             | Production build / run the server (serves the built client)  |
| `pnpm docs:sync`                        | `docs:pull`, then `ingest` — run after the wiki changes      |
| `pnpm docs:pull`                        | Clone / update the wiki repo in `DOCS_DIR` (git only)        |
| `pnpm ingest`                           | Sync `DOCS_DIR` into Postgres and embed new/changed chunks   |
| `pnpm ingest:dry`                       | Chunk statistics only — no database writes, no Gemini calls  |
| `pnpm test`                             | Server unit tests (chunker, Gemini error mapping)            |
| `pnpm typecheck` / `pnpm lint`          | TypeScript and ESLint across all packages                    |
| `pnpm format` / `pnpm format:check`     | Prettier                                                     |
| `pnpm db:migrate` / `db:migrate:deploy` | Prisma migrations (dev / apply only)                         |
| `pnpm db:generate` / `pnpm db:studio`   | Regenerate the Prisma client / open Prisma Studio            |

## Project Structure

See [CLAUDE.md](CLAUDE.md) for the annotated `client/src` and `server/src` trees and the coding rules,
and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how a question flows through the system.

## Follow-ups (not built yet, on purpose)

- Authentication (history is scoped by an anonymous browser id — fine for an internal tool).
- Hosting: a free hosted Postgres with pgvector (e.g. Neon, Supabase) + a Node host; Dockerfile.
- CI (format, lint, typecheck, test, build) and git hooks once the folder becomes a git repository.
- An HNSW index if the corpus grows past ~100k chunks (see [docs/DATABASE.md](docs/DATABASE.md)).
