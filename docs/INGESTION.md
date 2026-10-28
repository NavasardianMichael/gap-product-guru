# Ingestion — Gap Product Guru

How the Markdown docs become searchable vectors: the `pnpm ingest` CLI, the chunking rules and the
reasoning behind each one, and what to do when the free-tier quota runs out halfway.
**Source of truth:** `server/src/ingest/` (`index.ts`, `markdownChunker.ts`, `scanDocs.ts`).

---

## Commands

```bash
pnpm docs:sync    # docs:pull, then ingest — the one command to run after the docs change
pnpm docs:pull    # clone / update the docs repo in DOCS_DIR (git only, no DB, no Gemini)
pnpm ingest:dry   # chunk everything, print stats — no DB writes, no Gemini calls
pnpm ingest       # sync DOCS_DIR → Postgres, then embed every chunk that has no vector
```

`DOCS_DIR` (default `../data/docs`, resolved from `server/`) can point anywhere; subfolders are
scanned recursively. Only `.md` files are read.

## The docs repo (`pnpm docs:pull`)

The source is the Azure DevOps project wiki `GAP-International.wiki` (branch `wikiMaster`), set by
`DOCS_REPO_URL` / `DOCS_REPO_BRANCH`. `pnpm docs:pull` clones it into `DOCS_DIR` on the first run and
pulls on every run after; `src/ingest/pullDocs.ts`.

⚠️ **Project rule: `git clone` (once) and `git pull` are the only git commands ever run on the docs
repo** — by the command, by hand or by an agent. No `reset`, `clean`, `checkout`, `config`,
`sparse-checkout`, commits or pushes. The wiki is edited in Azure DevOps only, never in `data/docs/`.

For Claude Code this is enforced by a PreToolUse hook (`.claude/hooks/guardDocsRepo.mjs`, wired in
`.claude/settings.json`): before every shell command and file edit it denies git write subcommands,
file edits and shell file writes that target `data/docs/`. Read-only git (`status`, `log`, `diff`,
`show`, listing `branch -a`…) plus `clone`, `pull` and `fetch` pass. It guards Claude only — the
app's `pnpm docs:pull` and your own terminal are not affected.

| Choice                                                  | Why                                                                                                                                                                                            |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clone **inside** the project (`data/docs/`, gitignored) | A fresh checkout on any machine needs one command, no setup elsewhere.                                                                                                                         |
| Shallow clone (`--depth 1`)                             | Ingestion needs the current pages, not their history. The whole repo is checked out, including `.attachments/` (~1,100 images, videos, PDFs) — ingestion skips them since it reads `.md` only. |
| `git pull --ff-only`                                    | Never creates a merge commit. If the local copy has diverged (someone edited it), the pull fails loudly instead of mixing local edits into the docs.                                           |
| `-c core.longpaths=true` on each git command            | Nested wiki pages produce paths of ~250 characters; with the project path in front they pass Windows' 260-character limit. Passed per command, so nothing is written to the repo config.       |
| `DOCS_REPO_BRANCH` is used by the clone only            | Pull follows the branch that was cloned. To switch branches, delete `data/docs/` and run `pnpm docs:pull`.                                                                                     |
| No `.gitkeep` in `data/docs/`                           | `git clone` refuses a non-empty target folder. The command creates the folder.                                                                                                                 |

Every `.md` under `DOCS_DIR` is ingested, so don't drop extra files into `data/docs/`.

Auth uses the git credential manager (cached after the first browser sign-in on Windows). Never put a
PAT in `DOCS_REPO_URL`. For unattended runs (CI, cron) use a PAT through the credential helper and set
`GIT_TERMINAL_PROMPT=0` so a missing credential fails instead of waiting for input.

Azure wiki pages rarely start with a `# H1` (30 of ~400), so most titles come from the file name. The
wiki writes spaces as `-` and percent-encodes the rest (`Setup%3A-Self%2Dhosted.md`), which
`titleFromPath` decodes to `Setup: Self-hosted`.

## What a run does

1. **Scan** — every `.md` under `DOCS_DIR`, ids are paths relative to it with forward slashes
   (`guides/install.md`), so they match on Windows and Linux.
2. **Sync** — for each file, `sha256(CHUNKER_VERSION + GEMINI_EMBEDDING_MODEL + content)`:
   - unchanged hash → skip (its chunks and vectors stay);
   - new or changed → one transaction deletes the old document (chunks cascade) and inserts the new
     chunks with `embedding = NULL`;
   - files no longer on disk → their documents are deleted.
3. **Embed** — repeatedly take `EMBED_BATCH_SIZE` chunks `WHERE embedding IS NULL`, embed them in one
   `batchEmbedContents` request, write the vectors. Loop until none are left.

Because "needs a vector" is just `embedding IS NULL`, **every run resumes where the last one stopped** —
after a crash, Ctrl+C or an exhausted quota. Re-running is always safe and only costs API calls for
new, changed or still-unembedded chunks.

## Chunking rules (and why)

| Rule                                                                                      | Why                                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Split at Markdown headings (`#`–`######`), ignoring `#` inside code fences                | Documentation is already organised by headings; a section is the natural unit of meaning. Shell comments (`# …`) inside code are not headings.            |
| Keep a heading **breadcrumb** per chunk (`Setup › Windows`)                               | It is prefixed to the embedding text and shown as the source label, so a chunk that says "run the installer" is still findable as being about Windows.    |
| Pack whole blocks up to **~500 tokens** (chars ÷ 4)                                       | Top-8 retrieval then stays ~4k tokens of context; most procedures fit whole. Smaller chunks lose context, larger ones dilute similarity.                  |
| Never split paragraphs, lists, tables or code blocks unless oversized                     | Half a code block or half a table is useless as a source.                                                                                                 |
| Oversized blocks split by lines; code fences re-opened with their language in every piece | Each chunk stays valid Markdown and keeps its highlighting language.                                                                                      |
| Sections under ~80 tokens merge into the next one                                         | A lone heading or one-line intro makes a near-empty, noisy vector.                                                                                        |
| A merged chunk is labelled with the **shared parent** breadcrumb                          | Merging `Setup › Windows` + `Setup › macOS` is labelled `Setup` — labelling it `macOS` would mislead both retrieval and the reader (a real bug we hit).   |
| Title = frontmatter `title:` → first `# H1` → file name                                   | Frontmatter is stripped from the content but its title is the best label when present.                                                                    |
| **No overlap** between chunks                                                             | Overlap mostly helps fixed-size splitters that cut mid-thought; heading-aware splitting + breadcrumbs already carry the context, and overlap costs quota. |

Headings in setext style (`Title\n=====`) are not recognised — rare in modern docs. If the corpus uses
them, add them to `HEADING_PATTERN` handling and bump `CHUNKER_VERSION`.

### Changing the rules

Edit `markdownChunker.ts`, add/adjust tests in `markdownChunker.test.ts`, run `pnpm test` and
`pnpm ingest:dry`, then **bump `CHUNKER_VERSION`**. The version is part of every document hash, so the
next `pnpm ingest` re-chunks and re-embeds everything instead of mixing old and new chunks.
The same happens automatically when `GEMINI_EMBEDDING_MODEL` changes (vectors from two models are not
comparable).

## Embedding input format

`gemini-embedding-2` has no `taskType` parameter; Google's guidance is to mark the role in the text:

- document: `title: {document title} | text: {breadcrumb}\n\n{chunk content}`
- query: `task: search result | query: {question}`

Both live in `server/src/lib/gemini.ts` (`toDocumentEmbeddingText`, `toQueryEmbeddingText`).
Each chunk is sent as its **own** `Content` (`{ parts: [{ text }] }`): passing a plain `string[]` makes
the SDK merge them into one aggregated embedding (verified in the SDK source).

## Sizing the real corpus

700k words ≈ 1.0–1.2M tokens → roughly **2,500–4,000 chunks** → 50–80 embedding requests at the
default batch size of 50. `pnpm ingest:dry` prints the real numbers (`chunks`, `totalTokens`,
`embedRequests`, largest files) before you spend any quota.

## Quotas during ingestion

Google no longer publishes free-tier limits; check your project's
[AI Studio rate-limit page](https://aistudio.google.com/rate-limit). The CLI handles both kinds of 429:

- **Per-minute limit** (`AI_RATE_LIMITED`) → waits Gemini's `retryDelay` (default 60s) and continues;
  gives up after 10 consecutive waits.
- **Per-day quota** (`AI_QUOTA_EXHAUSTED`) → stops with
  `today's free embedding quota is used up — progress is saved` and the number of chunks left.
  Run `pnpm ingest` again after midnight Pacific time.

⚠️ Ingestion and chat share **one** embedding quota (every question embeds the query). Exhausting it
with a big ingest also breaks chat retrieval until the reset — ingest outside working hours.

## Troubleshooting

| Symptom                                    | Fix                                                                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `docs folder not found`                    | Run `pnpm docs:pull`, or set `DOCS_DIR` in `server/.env.development.local`.                                                   |
| `DOCS_REPO_URL is not set`                 | Copy `DOCS_REPO_URL` / `DOCS_REPO_BRANCH` from `server/.env.example` into `server/.env.development.local`.                    |
| `the docs folder has files but is not …`   | `DOCS_DIR` holds hand-copied files. Move them away; the pull clones into an empty or missing folder only.                     |
| `Authentication failed` / pull hangs       | Run `git ls-remote <DOCS_REPO_URL>` once in a terminal to sign in through the credential manager, then pull again.            |     | `GEMINI_API_KEY is not set on the server` | Add the key to `server/.env.development.local`. |
| Chat says "Documentation not indexed yet"  | No chunk has a vector yet — run `pnpm ingest` (check it finished).                                                            |
| A file edit isn't picked up                | It is if the bytes changed; check the file is under `DOCS_DIR` and ends in `.md`.                                             |
| Want a completely fresh index              | `docker exec gap-product-guru-postgres psql -U guru -d gap_product_guru -c "TRUNCATE documents CASCADE;"` then `pnpm ingest`. |
| `Expected N embeddings of 768 dims, got …` | The API returned a partial batch; re-run (nothing was written for that batch). Lower `EMBED_BATCH_SIZE` if it repeats.        |
