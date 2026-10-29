# Gap Product Guru — Claude Code Instructions

RAG chatbot that answers questions about a product from its Markdown documentation (>700k words).
Conventions follow the sibling **`regionify`** project; the deliberate deviations are listed in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#deviations-from-regionify).

## Docs — read the one for your task

| Task                                                        | Read                                                                 |
| ----------------------------------------------------------- | -------------------------------------------------------------------- |
| How the pieces fit, request flow, why RAG                   | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                         |
| Docs repo sync, chunking, `pnpm ingest`, ingest quotas      | [docs/INGESTION.md](docs/INGESTION.md)                               |
| Retrieval, prompt, citations, chat history, answer quality  | [docs/RETRIEVAL_AND_PROMPTING.md](docs/RETRIEVAL_AND_PROMPTING.md)   |
| Model choice, free-tier limits, 429 handling, going paid    | [docs/GEMINI_MODELS_AND_QUOTAS.md](docs/GEMINI_MODELS_AND_QUOTAS.md) |
| Schema, pgvector, migrations, Prisma 7                      | [docs/DATABASE.md](docs/DATABASE.md)                                 |
| `POST /api/chat` SSE frames, abort, error frames            | [docs/STREAMING_PROTOCOL.md](docs/STREAMING_PROTOCOL.md)             |
| Client stores, hooks, UI states, styling (antd + Tailwind)  | [docs/CHAT_UI.md](docs/CHAT_UI.md)                                   |
| Deploy pipeline, release, secrets, ports, operations        | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)                             |
| One-time server setup (DNS, systemd, nginx, certs, secrets) | [docs/PRODUCTION_SETUP.md](docs/PRODUCTION_SETUP.md)                 |
| Server config templates and their rules                     | [deployment/CLAUDE.md](deployment/CLAUDE.md)                         |
| Setup, scripts, ports                                       | [README.md](README.md)                                               |

---

## Monorepo Overview

pnpm workspace (`packageManager: pnpm@11.3.0`) with three packages:

- `@gap-product-guru/shared` — types, zod schemas and constants used by both sides. Built with `tsc`
  to `dist/`; root scripts build it first.
- `@gap-product-guru/server` — Express 5 API + ingest CLI (Prisma 7, pgvector, Gemini).
- `@gap-product-guru/client` — React 19 + Vite + antd 6 + Tailwind 4 chat UI.

```bash
pnpm dev            # shared build, then client (7005) + server (9005)
pnpm docs:sync      # pull the wiki repo into data/docs, then ingest
pnpm ingest         # sync data/docs into Postgres and embed new chunks
pnpm ingest:dry     # chunk stats only — no DB writes, no Gemini calls
pnpm test           # server unit tests (vitest)
pnpm typecheck && pnpm lint && pnpm format:check
pnpm db:migrate     # prisma migrate dev
pnpm build:release  # build + assemble the deployable out/app (what CI ships)
pnpm env:base64 production | clip   # server/.env.production.local → ENV_SERVER_BASE64 secret
```

Production: push to `master` deploys to https://gap-product-guru.mnavasardian.com (GitHub Actions →
SSH → systemd, Postgres in Docker on 127.0.0.1:5008, nightly wiki-sync timer). See docs/DEPLOYMENT.md.

---

## Infrastructure

- `docker compose up -d` → Postgres 17 with pgvector (`pgvector/pgvector:pg17`) on host port **5435**.
- Server env: `server/.env.development.local` (copy of `server/.env.example`). Prisma reads the same file.
- The docs dataset is the Azure DevOps wiki repo, cloned into `data/docs/` (gitignored) by
  `pnpm docs:pull`, which pulls on every later run.

---

## Universal Rules

### Core

- Simple, readable code over clever abstractions; the docs carry the reasoning.
- Early returns, destructured params, explicit return types on exported functions.
- Named exports everywhere, except page components and `App.tsx` (default exports).
- No barrel files (`shared/src/index.ts` is the one exception).

### TypeScript

- `type`, not `interface` (except global augmentation such as `server/src/types/express.d.ts`).
- Inline type imports: `import { type Foo, bar } from '…'`.
- No `any`. Shared enums are `as const` objects plus a derived `XType`.

### Code Style

- Prettier from the root `.prettierrc` (with `prettier-plugin-tailwindcss`); import order is enforced by
  `eslint-plugin-simple-import-sort` in each package.
- Comments only where the purpose is not obvious — explain _why_, not _what_.
- Files are camelCase `.ts` on the server, PascalCase `.tsx` for components; docs are SCREAMING_SNAKE_CASE.

### Forbidden (All Packages)

- Committing `.env*` files (except `.env.example`) or anything in `data/docs/`.
- Reading or writing any `.env*` file other than `.env.example` (Claude). Enforced by the PreToolUse
  hook `.claude/hooks/guardEnvFiles.mjs`.
- Running any git command on the docs repo (`data/docs/`) other than read-only ones, `git clone`
  (once), `git fetch` and `git pull` — no reset, clean, checkout, config, sparse-checkout, branch,
  commit or push. Enforced for Claude by the PreToolUse hook `.claude/hooks/guardDocsRepo.mjs`.
- Adding `compression()` (or any buffering middleware) without excluding `text/event-stream`.
- Detecting SSE disconnects with `req.on('close')` — use `res.on('close')` (see STREAMING_PROTOCOL.md).
- Changing `EMBEDDING_DIMENSIONS` or the `vector(768)` column without a migration and full re-ingest.

---

## Shared Package (`@gap-product-guru/shared`)

```
shared/src/
├── types/api.ts          # ApiResponse / ApiError envelope + ErrorCode
├── types/chat.ts         # ChatStreamFrame, ChatSource, ConversationSummary, …
├── schemas/chat.ts       # chatRequestSchema, idParamsSchema, feedbackRequestSchema, admin schemas
├── constants/chat.ts     # CHAT_MESSAGE_MAX_LENGTH, CLIENT_ID_HEADER, SSE_DONE
└── constants/httpStatus.ts
```

Import from the package root: `import { ErrorCode, type ChatSource } from '@gap-product-guru/shared';`

---

## Client (`@gap-product-guru/client`)

### Structure

```
client/src/
├── api/<domain>/{endpoints,index,types}.ts   # fetch calls; relative /api URLs
├── components/{admin,antd,router,chat,conversations,shared}/
├── constants/          # routes, UI copy (chat.ts), loading statuses
├── helpers/            # pure helpers (clientId, error, common)
├── hooks/              # useChat, useConversations, … — API calls live here, never in stores
├── pages/              # ChatPage, SharedConversationPage, AdminPage, AppErrorPage (default exports)
├── store/<domain>/{store,selectors,types}.ts   # Zustand
└── styles/             # tailwind.css, markdown.css, antd-theme.ts
```

### Rules

- Path alias `@/` → `src/`. Never write route literals; use `ROUTES` / `getConversationRoute`.
- UI strings live in `constants/chat.ts` (no i18n — single-language internal tool).
- Prefer antd components (`Flex`, `Typography`, `Button`). antd's unlayered styles beat Tailwind 4's
  layered utilities, so **padding/margin on antd components needs the `!` suffix** (`px-4!`).
- Hoist inline objects passed to antd props to module constants; wrap callbacks passed as props in `useCallback`.
- Merge class names with `combineClassNames([...])` from `helpers/common.ts`.

---

## Server (`@gap-product-guru/server`)

### Structure

```
server/src/
├── app.ts / index.ts    # createApp() + listen / graceful shutdown
├── config/env.ts        # zod-validated env (exits on invalid)
├── db/index.ts          # Prisma singleton with @prisma/adapter-pg
├── generated/prisma/    # generated client (gitignored)
├── lib/                 # logger (pino), gemini (client, embeddings, error mapping)
├── middleware/          # errorHandler (+AppError), validate, rateLimiter, requireClientId
├── repositories/        # Prisma + raw vector SQL
├── services/            # chatService (SSE), chatPrompts, retrieval, conversations, feedback, shares, docs
├── routes/              # index (/health + mounts), chat (SSE), conversations, messages, shares, docs, admin
├── ingest/              # CLI, scanDocs, markdownChunker (+ tests)
└── web/serveClient.ts   # production: serve client/dist
```

### Rules

- Imports carry `.js` and use the `@/` alias (`tsx` in dev, `tsc-alias` on build).
- Layering: route (thin, `try/catch → next(error)`) → service → repository. Throw `AppError` with an
  `ErrorCode`; never send ad-hoc error shapes.
- Every response uses the envelope `{ success: true, data }` / `{ success: false, error: { code, message } }`.
- Routes mount under `/api`. Middleware order (app.ts): trust proxy → helmet → json → pino-http →
  `/api` routes → (prod) serveClient → 404 → errorHandler.
- Gemini is only touched through `lib/gemini.ts`; map its errors with `toAiError`.
- Logging: `logger.info({ ...context, action: 'snake_case_event' }, 'short message')`; errors under `err`.

### Environment Variables

See `server/.env.example` (commented). Validation lives in `server/src/config/env.ts`; add new vars in both.

---

## AI Agent Behavior

- When the user says "it's best practice" (or similar) about a convention, add it as a bullet to the
  relevant Rules section above.
- When a decision is made or a trap is found, record the _why_ in the matching `docs/*.md` file.
