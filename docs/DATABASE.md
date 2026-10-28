# Database — Gap Product Guru

PostgreSQL 17 + pgvector, accessed through Prisma 7. Covers the schema, how vectors are stored
despite Prisma not supporting them, the migration workflow, and why there is no vector index yet.
**Source of truth:** `server/prisma/schema.prisma`, `server/src/repositories/`.

---

## Running it

`docker compose up -d` starts `pgvector/pgvector:pg17` as `gap-product-guru-postgres` on host port
**5435** (5432/5433/5004 are used by sibling projects). Credentials default to `guru` / `guru`,
database `gap_product_guru`; override with a root `.env` (see `.env.example`). Data lives in the
`postgres_data` volume.

```bash
docker exec -it gap-product-guru-postgres psql -U guru -d gap_product_guru
```

## Schema

| Table           | Purpose                                        | Key columns                                                                                   |
| --------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `documents`     | One row per Markdown file                      | `path` (unique, forward slashes), `title`, `content_hash`                                     |
| `chunks`        | Heading-aware slices of a document             | `document_id` (cascade), `position`, `heading`, `content`, `embedding vector(768)` (nullable) |
| `conversations` | One chat thread                                | `client_id` (anonymous browser id), `title`, `updated_at`                                     |
| `messages`      | User/assistant messages, always saved in pairs | `conversation_id` (cascade), `role` enum, `content`, `sources` (JSON)                         |

Conventions follow regionify: `String @id @default(uuid())`, camelCase fields with `@map("snake_case")`,
plural `@@map` table names, `created_at` / `updated_at`.

`chunks.embedding IS NULL` means "not embedded yet" — that single fact makes ingestion resumable
([INGESTION.md](./INGESTION.md)).

## pgvector with Prisma

Prisma has no vector type, so the column is declared `Unsupported("vector(768)")?`:

- Prisma can still create/delete chunk rows (the optional column is simply left NULL).
- Everything that reads or writes the vector is **raw SQL** in `chunkRepository.ts`: vectors are sent
  as text (`'[0.12,-0.03,…]'`) and cast with `::vector`; search orders by `<=>` (cosine distance).
- The `vector` extension is created by the first migration — a line added by hand to the generated
  SQL. Prisma's old `postgresqlExtensions` preview feature is deprecated, and extensions are not part
  of Prisma's diff, so this causes no drift.

## Why there is no vector index (yet)

An exact scan over ~4k vectors of 768 dims (~12 MB) takes milliseconds and has perfect recall.
An HNSW index would add approximation and a maintenance trap: Prisma cannot model it, so every later
`prisma migrate dev` would propose a `DROP INDEX` for it.

Add one when the corpus passes ~100k chunks:

```bash
pnpm --filter @gap-product-guru/server exec prisma migrate dev --create-only --name chunks_embedding_hnsw
# put this in the new migration.sql:
#   CREATE INDEX chunks_embedding_hnsw_idx ON chunks USING hnsw (embedding vector_cosine_ops);
pnpm db:migrate
```

…and from then on **delete the `DROP INDEX "chunks_embedding_hnsw_idx"` line** Prisma adds to every
future migration.

## Prisma 7 specifics

- `server/prisma.config.ts` holds the datasource URL (Prisma 7 removed `url` from the schema) and
  loads `server/.env.development.local` itself — Prisma 7 no longer reads `.env` files.
  `?? ''` keeps `prisma generate` working on a fresh clone without an env file.
- Generator `prisma-client` writes TypeScript to `server/src/generated/prisma` (gitignored, ESM, `.js`
  import extensions for NodeNext). Import from `@/generated/prisma/client.js`.
- The client talks to Postgres through `@prisma/adapter-pg` (`server/src/db/index.ts`).
- `postinstall` runs `prisma generate`; `prisma migrate dev` no longer does it for you — run
  `pnpm db:generate` after editing the schema.
- `prisma`, `@prisma/client` and `@prisma/adapter-pg` are pinned to **`~7.10.0`** because
  `prisma@latest` currently resolves to an 8.0 release candidate. Upgrading to 8 is a separate task.

## Migration workflow

```bash
# 1. edit server/prisma/schema.prisma
pnpm db:migrate                 # prisma migrate dev — creates + applies a migration, regenerates nothing
pnpm db:generate                # regenerate the client
# hand-written SQL needed? create first, edit, then apply:
pnpm --filter @gap-product-guru/server exec prisma migrate dev --create-only --name <name>
```

Production / another machine: `pnpm db:migrate:deploy` applies pending migrations only.

## Changing the embedding dimension

`768` appears in two places that must agree: `Unsupported("vector(768)")` in the schema and
`EMBEDDING_DIMENSIONS` in `server/src/lib/gemini.ts`. To change it:

1. Update both, create a migration that alters the column
   (`ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(1536) USING NULL;`).
2. Bump `CHUNKER_VERSION` (forces every document to be re-chunked) and run `pnpm ingest`.

## Resetting data

```bash
# wipe the index (re-run pnpm ingest afterwards)
docker exec gap-product-guru-postgres psql -U guru -d gap_product_guru -c "TRUNCATE documents CASCADE;"
# wipe all chat history
docker exec gap-product-guru-postgres psql -U guru -d gap_product_guru -c "TRUNCATE conversations CASCADE;"
```
