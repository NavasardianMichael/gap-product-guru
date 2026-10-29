# Deployment

Push to `master` → GitHub Actions verifies and builds one release → the tarball lands on the server
→ `pnpm install` + `prisma migrate deploy` → symlink flip → `systemctl restart` → health check.
The same machinery as crossword (and bookie), adapted to a single process.

The one-time server setup, in order, is [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md).

## Shape

```
gap-product-guru.mnavasardian.com ──► nginx ──► 127.0.0.1:9008  gap-product-guru (Express: /api + client)
                                         └────► /assets/  from disk (hashed Vite bundles)
                                                      │
                                                      ▼
                                           127.0.0.1:5008  Postgres 17 + pgvector (Docker)

gap-product-guru-docs-sync.timer (03:30 nightly) ──► git pull the wiki ──► ingest ──► Postgres
```

**One origin, one process.** Express serves the API and the built client
(`server/src/web/serveClient.ts`), so the browser needs no CORS — unlike crossword's two hosts.
Answering a question reads only Postgres; the wiki clone is read only by the nightly sync.

On-host layout:

```
$APP_DIR/                          /home/michael/apps/gap-product-guru
  app/releases/<sha>/
    server/                        dist · prisma · scripts · package.json · node_modules
    shared/                        the @gap-product-guru/shared package (file:../shared)
    client/dist/                   the built client
  app/current        -> releases/<sha>
  shared/.env.server               mode 600, written by every deploy — outside every release
  data/docs/                       the wiki clone (docs-sync) — outside every release
  db/docker-compose.prod.yml       written by the first deploy, never rewritten
  db/.env                          POSTGRES_* derived from DATABASE_URL — same, mode 600
```

Both systemd units use `WorkingDirectory=…/app/current/server`; systemd resolves the symlink at
start, so `systemctl restart` is what promotes a release. (`$APP_DIR/shared/` holds the env file
and has nothing to do with the `shared/` package inside a release.)

## The release

`pnpm build:release` = `pnpm build` (shared, client, server) + `scripts/build-release.mjs`, which
assembles `out/app/`:

- **`server/` is a standalone package**: compiled `dist/` (the Prisma client is compiled into
  `dist/generated`), the schema and migrations, `prisma.config.ts`, and a `package.json` whose
  runtime dependencies are pinned to the exact versions the workspace resolved — plus the `prisma`
  CLI, which applies migrations on the host. `pnpm-workspace.yaml` (`packages: []`) makes it its
  own workspace root; CI resolves its `pnpm-lock.yaml` so the host install is
  `--frozen-lockfile`.
- **`shared/`** is the workspace package's `dist/` + a trimmed `package.json`; the server depends
  on it as `file:../shared`.
- **`client/dist/`** sits where `serveClient` looks for it (`<server>/../client/dist`).

Why not ship the workspace or a prebuilt `node_modules`: see the header of
`scripts/build-release.mjs` (and crossword's `scripts/build-api-release.mjs`).

### Installing on the host: `--ignore-scripts` + `fetch-prisma-engines.cjs`

pnpm 11 crashes with **`readStream must be readable`** when it runs Prisma's lifecycle scripts
from a non-interactive shell — which `ssh … bash -s` is (reproduced locally, 2026-10-28). So the
deploy installs with `--ignore-scripts` and then runs `node scripts/fetch-prisma-engines.cjs`,
which executes the only script the release needs: `@prisma/engines`' postinstall, which downloads
the schema engine `prisma migrate deploy` uses. The Prisma client itself needs nothing — it is
compiled into `dist/`.

## The workflows

|              |                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------- |
| `ci.yml`     | PR → master: format · lint · typecheck · test · `build:release`.                                |
| `deploy.yml` | Push to `master` (docs-only pushes skipped) or **Run workflow**: `verify` → `build` → `deploy`. |

The deploy script, on the host: extract → write `shared/.env.server` → install (above) →
`ensure_database` → `prisma migrate deploy` → flip `app/current` → restart → poll `/api/health`
and `/` → keep the newest 3 releases.

**The database is create-only from CI.** `ensure_database` creates the Postgres container only
when it does not exist (deriving `db/.env` from `DATABASE_URL`), starts a stopped one, and
otherwise leaves it alone — never `down`, `rm`, a volume operation or a rewrite of `db/.env` /
the compose file. A `DATABASE_URL` that is not `127.0.0.1:5008` is not managed at all. Same
table and rules as crossword's DEPLOYMENT.md.

**The deploy does not index the wiki.** A full first index can exhaust a day of free Gemini quota;
it is done once by hand (PRODUCTION_SETUP step 9), then nightly by the timer.

## Secrets

GitHub → Settings → Secrets and variables → Actions → **Repository secrets**:

| Name                | Value                                 |
| ------------------- | ------------------------------------- |
| `SSH_HOST`          | server hostname or IP                 |
| `SSH_USER`          | `michael`                             |
| `SSH_KEY`           | private deploy key (full PEM)         |
| `SSH_PORT`          | optional, defaults to 22              |
| `APP_DIR`           | `/home/michael/apps/gap-product-guru` |
| `ENV_SERVER_BASE64` | `pnpm env:base64 production` (below)  |

`ENV_SERVER_BASE64` is `server/.env.production.local`: `DATABASE_URL`, `GEMINI_API_KEY`,
`GEMINI_CHAT_MODEL`, `PRODUCT_NAME`, `DOCS_REPO_URL`, `DOCS_REPO_BRANCH`, **`DOCS_REPO_TOKEN`**,
`DOCS_WEB_URL`, and any tuning keys from `server/.env.example`. Leave out `NODE_ENV`, `PORT`,
`HOST` and `DOCS_DIR`: the deploy strips and rewrites them (`production`, `9008`, `127.0.0.1`,
`$APP_DIR/data/docs`) so they cannot drift from the unit and nginx.

`DOCS_REPO_TOKEN` is an Azure DevOps PAT (Code: Read). The server has no browser for the git
credential manager, so `pullDocs.ts` sends the token as an HTTP auth header through
`GIT_CONFIG_*` environment variables — never in the URL, the command line or a config file.

## Ports

| Port | What     | Declared in                                                                            |
| ---- | -------- | -------------------------------------------------------------------------------------- |
| 9008 | Express  | `deploy.yml` (`APP_PORT`, written as `PORT`), nginx `.conf`                            |
| 5008 | Postgres | `deployment/docker-compose.prod.yml`, `deploy.yml` (`ensure_database`), `DATABASE_URL` |

Chosen beside crossword (7007/9007/5007), bookie (7004/9004/5004), hangman (7005) and regionify
(9002/5433) in case they share a host. Changing one means editing every file above.

## Operations

```bash
journalctl -u gap-product-guru -f
systemctl status gap-product-guru
curl -s http://127.0.0.1:9008/api/health

# wiki sync: next/last run, run now, follow it
systemctl list-timers gap-product-guru-docs-sync
sudo systemctl start gap-product-guru-docs-sync
journalctl -u gap-product-guru-docs-sync -f

# rollback — migrations do NOT roll back
ls -t /home/michael/apps/gap-product-guru/app/releases
ln -sfn /home/michael/apps/gap-product-guru/app/releases/<sha> /home/michael/apps/gap-product-guru/app/current
sudo systemctl restart gap-product-guru

# psql
docker exec -it gap-product-guru-postgres-prod psql -U guru -d gap_product_guru

# a CLI by hand (same env as the service)
cd /home/michael/apps/gap-product-guru/app/current/server
set -a; . /home/michael/apps/gap-product-guru/shared/.env.server; set +a
node dist/ingest/index.js --dry-run
```

## Gotchas

- **The database is the only state** — back up the Postgres volume; releases and the wiki clone
  are disposable (a deleted `data/docs` is re-cloned by the next sync, and nothing is re-embedded:
  page hashes match).
- **One app process.** The chat rate limiter is in memory, and `trust proxy` (`loopback`) assumes
  exactly one nginx hop on the same host.
- **SSE through nginx** needs `proxy_buffering off`, `proxy_read_timeout` ≥ 120s and no gzip for
  `text/event-stream` — all in the `.conf`; see [STREAMING_PROTOCOL.md](STREAMING_PROTOCOL.md).
- **`/admin` is open** (decision, see [CHAT_UI.md](CHAT_UI.md#admin-panel)); the nginx `.conf` has
  a commented block to restrict it by IP.
- **A new Gemini key from a new Google project cannot use `gemini-2.5-flash`** — keep
  `GEMINI_CHAT_MODEL=gemini-3.8-flash` ([GEMINI_MODELS_AND_QUOTAS.md](GEMINI_MODELS_AND_QUOTAS.md)).
