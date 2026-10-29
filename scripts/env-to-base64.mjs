#!/usr/bin/env node
/**
 * Encodes the server env file to base64 for the `ENV_SERVER_BASE64` GitHub secret.
 *
 *   pnpm env:base64 production            -> reads server/.env.production.local
 *   pnpm env:base64 production | clip     (Windows)
 *   pnpm env:base64 production | pbcopy   (macOS)
 *
 * The base64 is the ONLY thing on stdout, so it pipes cleanly; the key list and warnings go to
 * stderr. It prints a secret to your terminal by design — not on a shared screen.
 *
 * Usage: node scripts/env-to-base64.mjs <environment>
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [environment] = process.argv.slice(2);

if (!environment) {
  console.error('Usage: pnpm env:base64 <environment>   e.g. pnpm env:base64 production');
  process.exit(1);
}

const filePath = path.join(rootDir, 'server', `.env.${environment}.local`);
if (!existsSync(filePath)) {
  console.error(`Not found: server/.env.${environment}.local`);
  console.error(
    'Create it from server/.env.example with production values (docs/PRODUCTION_SETUP.md).',
  );
  process.exit(1);
}

// LF only: a CRLF file from Windows would carry \r into every value on the Linux host.
const content = readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

/** Key names only — values are never echoed. */
const keys = content
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => line.split('=')[0]?.trim())
  .filter(Boolean);

const warn = (message) => console.error(`  WARNING  ${message}`);

// The deploy strips and rewrites these so they cannot drift from the systemd unit and nginx.
const OWNED_BY_DEPLOY = ['NODE_ENV', 'PORT', 'HOST', 'DOCS_DIR'];
const REQUIRED = ['DATABASE_URL', 'GEMINI_API_KEY', 'DOCS_REPO_URL', 'DOCS_REPO_TOKEN'];

console.error(`server/.env.${environment}.local — ${keys.length} keys:`);
for (const key of keys) console.error(`  - ${key}`);

const owned = keys.filter((key) => OWNED_BY_DEPLOY.includes(key));
if (owned.length > 0) warn(`${owned.join(', ')} will be overwritten by the deploy — remove them.`);
const missing = REQUIRED.filter((key) => !keys.includes(key));
if (missing.length > 0) warn(`missing: ${missing.join(', ')}`);
if (/^DATABASE_URL=.*localhost/m.test(content)) {
  warn('DATABASE_URL uses localhost — use 127.0.0.1 (localhost can resolve to ::1).');
}

process.stdout.write(Buffer.from(content).toString('base64'));
