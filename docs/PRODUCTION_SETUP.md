# Production setup

The one-time steps to run Gap Product Guru at **https://gap-product-guru.mnavasardian.com**, in
order. How the pipeline works is in [DEPLOYMENT.md](DEPLOYMENT.md).

Assumed to be in place already (as for crossword), so nothing here installs them:

- the `michael` user, with sudo
- Node 24 at `/usr/bin/node` (`node -v`); pnpm is resolved by the deploy itself
- Docker, with `michael` in the `docker` group (`groups michael` lists `docker`)
- nginx, certbot (with its nginx plugin: `sudo certbot plugins` lists `nginx`), and git

Nothing is downloaded on the server by hand. Each step names a file in this repo's `deployment/`
folder and the command that opens its destination in nano: copy the whole repo file, paste
(right-click or `Ctrl+Shift+V`), save with `Ctrl+O`, `Enter`, exit with `Ctrl+X`. To replace a
file that is already there, empty it first: `sudo truncate -s 0 <path>`.

**[DNS]** DNS provider · **[PC]** your machine, repo root · **[SRV]** server, as `michael` ·
**[AZ]** Azure DevOps · **[GH]** GitHub repo settings

## 1. DNS **[DNS]** (once)

| Type | Name                                | Value           |
| ---- | ----------------------------------- | --------------- |
| A    | `gap-product-guru.mnavasardian.com` | `<SERVER_IPV4>` |
| AAAA | `gap-product-guru.mnavasardian.com` | `<SERVER_IPV6>` |

Add the AAAA record only if that IPv6 address really reaches the server — Let's Encrypt checks
IPv6 first, and a wrong AAAA makes certbot fail. On Cloudflare, set the records to **DNS only**.

## 2. systemd units **[SRV]** (once)

Paste [gap-product-guru.service](../deployment/gap-product-guru.service) into:

```bash
sudo nano /etc/systemd/system/gap-product-guru.service
```

Paste [gap-product-guru-docs-sync.service](../deployment/gap-product-guru-docs-sync.service) into:

```bash
sudo nano /etc/systemd/system/gap-product-guru-docs-sync.service
```

Paste [gap-product-guru-docs-sync.timer](../deployment/gap-product-guru-docs-sync.timer) into:

```bash
sudo nano /etc/systemd/system/gap-product-guru-docs-sync.timer
```

Load them and start the app on every boot. The timer is enabled later, in step 9, once the first
index exists:

```bash
sudo systemctl daemon-reload
sudo systemctl enable gap-product-guru
```

Let the deploy (and you) restart the app and start a wiki sync without a password, and nothing
else. `visudo` checks the syntax and creates the file with mode `440`:

```bash
sudo EDITOR=nano visudo -f /etc/sudoers.d/gap-product-guru-deploy
```

```text
michael ALL=(root) NOPASSWD: /usr/bin/systemctl restart gap-product-guru, /usr/bin/systemctl start gap-product-guru-docs-sync
```

`command -v systemctl` must print `/usr/bin/systemctl`; otherwise use its real path. Check that
sudo does not ask for a password (the restart itself fails until the first deploy — that's fine):

```bash
sudo -n systemctl restart gap-product-guru
```

If a unit file changes in the repo later, paste it again, then
`sudo systemctl daemon-reload && sudo systemctl restart <that unit>`.

## 3. Certificate **[SRV]** (once)

The nginx file in step 4 names this certificate, so issue it first. `certonly --nginx` answers
Let's Encrypt's check through nginx and never edits a vhost:

```bash
sudo certbot certonly --nginx -d gap-product-guru.mnavasardian.com --deploy-hook "systemctl reload nginx"
sudo certbot renew --dry-run --cert-name gap-product-guru.mnavasardian.com
```

The second command should end with "all simulated renewals succeeded". Renewal is automatic
(certbot's server-wide timer, plus the saved deploy hook).

## 4. nginx **[SRV]** (once)

Paste [gap-product-guru.mnavasardian.com.conf](../deployment/gap-product-guru.mnavasardian.com.conf)
into:

```bash
sudo nano /etc/nginx/sites-available/gap-product-guru.mnavasardian.com.conf
```

```bash
sudo ln -sf /etc/nginx/sites-available/gap-product-guru.mnavasardian.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Until the first deploy the site answers 502 — nothing listens on 9008 yet.

## 5. Azure DevOps token for the wiki **[AZ]** (once, renew yearly)

https://dev.azure.com/GAP-Default → User settings → **Personal access tokens** → **New Token**:
name `gap-product-guru-docs-sync`, organization `GAP-Default`, expiration up to 1 year, scope
**Custom defined → Code → Read**. Copy it — it is shown once. It goes into `DOCS_REPO_TOKEN` in
step 6. Ideally create it from a service account, so access does not depend on one person.

When it expires the nightly sync fails with an authentication error in
`journalctl -u gap-product-guru-docs-sync`: create a new one, update step 6, redeploy.

## 6. Server environment **[PC]** (once)

On **your PC**, in the repo root. First a database password (64 hex characters; keep it in your
password manager — the first deploy creates the database with it):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Create `server/.env.production.local` (git-ignored):

```dotenv
LOG_LEVEL=info
DATABASE_URL=postgresql://guru:<that password>@127.0.0.1:5008/gap_product_guru

GEMINI_API_KEY=<key from https://aistudio.google.com/apikey>
GEMINI_CHAT_MODEL=gemini-3.8-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
PRODUCT_NAME=<the product's name>

DOCS_REPO_URL=https://GAP-Default@dev.azure.com/GAP-Default/GAP%20International/_git/GAP-International.wiki
DOCS_REPO_BRANCH=wikiMaster
DOCS_REPO_TOKEN=<the PAT from step 5>
DOCS_WEB_URL=https://dev.azure.com/GAP-Default/GAP%20International/_wiki/wikis/GAP-International.wiki
```

Leave out `NODE_ENV`, `PORT`, `HOST` and `DOCS_DIR` — the deploy sets them. Then copy the secret
value to the clipboard (`clip` on Windows, `pbcopy` on macOS):

```bash
pnpm env:base64 production | clip
```

It lists the key names (never values) in the terminal and warns about missing or deploy-owned
keys. Run it again and update the secret whenever this file changes.

## 7. GitHub secrets **[GH]** (once)

Settings → Secrets and variables → Actions → **Secrets** → **New repository secret** (not
Variables, not Environments):

| Name                | Value                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| `SSH_HOST`          | `<SERVER_IPV4>`                                                              |
| `SSH_USER`          | `michael`                                                                    |
| `SSH_KEY`           | the private key whose public half is in `/home/michael/.ssh/authorized_keys` |
| `APP_DIR`           | `/home/michael/apps/gap-product-guru`                                        |
| `ENV_SERVER_BASE64` | the clipboard from step 6                                                    |

`SSH_PORT` only if it is not 22.

## 8. First deploy **[GH]** (once)

Actions → **Deploy to Production** → **Run workflow**. It creates the release directories and
the database, applies the migrations and starts the app. After that every push to `master`
deploys, and every pull request runs **CI** first.

```bash
curl -s https://gap-product-guru.mnavasardian.com/api/health     # "status":"healthy"
```

The chat answers "Documentation not indexed yet" until step 9.

## 9. First index of the wiki **[PC]/[SRV]** (once)

The free Gemini tier may not embed the whole wiki in one day (it stopped at 950 of 1,053 chunks
locally). Pick one:

**A. Copy your local index (recommended — no quota used).** On **[PC]**, with the local Docker
database running and indexed:

```bash
docker exec gap-product-guru-postgres pg_dump -U guru -d gap_product_guru --data-only -t documents -t chunks -f /tmp/rag-index.sql
docker cp gap-product-guru-postgres:/tmp/rag-index.sql rag-index.sql
scp rag-index.sql michael@<SERVER_IPV4>:/tmp/
```

(`pg_dump -f` inside the container, not `> file`: Windows PowerShell's `>` writes UTF-16, which
`psql` cannot read.) Delete `rag-index.sql` locally afterwards — it is the whole wiki's text.

On **[SRV]** (the tables exist and are empty after the first deploy):

```bash
docker exec -i gap-product-guru-postgres-prod psql -U guru -d gap_product_guru < /tmp/rag-index.sql && rm /tmp/rag-index.sql
sudo systemctl start gap-product-guru-docs-sync     # clones the wiki; unchanged pages are not re-embedded
```

**B. Index on the server.** Just `sudo systemctl start gap-product-guru-docs-sync`; if the quota
runs out, the log says so and the next run resumes.

Follow it with `journalctl -u gap-product-guru-docs-sync -f`. Then turn on the nightly sync:

```bash
sudo systemctl enable --now gap-product-guru-docs-sync.timer
systemctl list-timers gap-product-guru-docs-sync
```

## 10. Check **[PC]** (any time)

```powershell
curl.exe -s  https://gap-product-guru.mnavasardian.com/api/health      # "status":"healthy"
curl.exe -sI https://gap-product-guru.mnavasardian.com/                # 200
curl.exe -sI http://gap-product-guru.mnavasardian.com/                 # 301 -> https
curl.exe -s  https://gap-product-guru.mnavasardian.com/api/docs/areas  # the product areas
```

Then ask one question in the browser — the answer should stream in word by word (if it appears
all at once, nginx is buffering: see DEPLOYMENT.md "Gotchas").
