# Deployment — invariants

Host-side configuration templates. How the pipeline works and the secrets:
[docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md); the ordered manual setup:
[docs/PRODUCTION_SETUP.md](../docs/PRODUCTION_SETUP.md). This file holds the rules that must not break.

```
deployment/
  gap-product-guru.mnavasardian.com.conf   nginx -> 127.0.0.1:9008, /assets/ from disk
  gap-product-guru.service                 systemd, the app (Express: /api + client)
  gap-product-guru-docs-sync.service       systemd oneshot: git pull the wiki + ingest
  gap-product-guru-docs-sync.timer         nightly 03:30
  docker-compose.prod.yml                  production Postgres + pgvector, loopback 5008
  db.env.example                           shape of $APP_DIR/db/.env — the first deploy writes it
```

**These are templates, not live config.** Nothing deploys them — they are pasted onto the server
by hand. Paths assume `APP_DIR=/home/michael/apps/gap-product-guru`. When you change one, say so:
someone has to re-paste it.

## Rules

- **The release symlink is the deploy mechanism.** Units use `WorkingDirectory=…/app/current/server`;
  `systemctl restart` promotes a release. Never point a unit at a concrete `releases/<sha>` path.
- **SSE needs `proxy_buffering off`, `proxy_read_timeout` ≥ 120s, and no gzip for
  `text/event-stream`** — otherwise answers arrive all at once or are cut off.
- **Pass `X-Forwarded-For`** — the chat rate limiter keys on the client IP (`trust proxy` =
  loopback, one hop). Never put a second proxy in front without revisiting that.
- **The database is create-only from CI.** `ensure_database` may create the Postgres container
  when it is missing or start a stopped one — never `down`, `rm`, `--force-recreate`, a volume
  operation, or a rewrite of an existing `db/.env` / compose file.
- **The image must include pgvector** (`pgvector/pgvector:pg17`) — the init migration runs
  `CREATE EXTENSION vector`.
- **`$APP_DIR/shared/.env.server` and `$APP_DIR/data/docs` live outside the releases** — release
  rotation deletes everything under `app/releases/`.
- **The docs repo is only ever cloned and pulled** (project rule, CLAUDE.md) — the docs-sync unit
  runs `dist/ingest/pullDocs.js`, nothing else touches `data/docs` with git.
- **Host installs use `--ignore-scripts` + `scripts/fetch-prisma-engines.cjs`** — pnpm 11 crashes
  running Prisma's lifecycle scripts over a non-interactive SSH shell (docs/DEPLOYMENT.md).
- **Ports 9008 / 5008** — changing one means editing every file in docs/DEPLOYMENT.md "Ports".
