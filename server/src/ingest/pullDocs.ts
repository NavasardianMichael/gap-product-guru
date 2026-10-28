// `pnpm docs:pull` — clone DOCS_REPO_URL into DOCS_DIR on the first run, `git pull` on every run after.
// `pnpm docs:sync` — the same, then `pnpm ingest`.
// Clone and pull are the only git commands ever run on the docs repo (project rule) — never add others.
// Walkthrough and troubleshooting: docs/INGESTION.md.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { env, SERVER_ROOT } from '@/config/env.js';
import { logger } from '@/lib/logger.js';

const docsDir = path.resolve(SERVER_ROOT, env.DOCS_DIR);

/**
 * Runs git in this terminal, so its progress, errors and credential prompts are visible.
 * `core.longpaths` applies to this command only (nothing is written to the repo's config):
 * nested wiki pages pass Windows' 260-character path limit.
 */
function runGit(args: string[]): void {
  execFileSync('git', ['-c', 'core.longpaths=true', ...args], { stdio: 'inherit' });
}

function main(): void {
  if (!env.DOCS_REPO_URL) {
    logger.error(
      { action: 'docs_pull_not_configured' },
      'DOCS_REPO_URL is not set — add it to server/.env.development.local',
    );
    process.exitCode = 1;
    return;
  }

  if (existsSync(path.join(docsDir, '.git'))) {
    // --ff-only never creates a merge commit; it fails instead if the local copy has diverged
    runGit(['-C', docsDir, 'pull', '--ff-only']);
    logger.info({ docsDir, action: 'docs_pulled' }, 'docs repo pulled');
    return;
  }

  if (existsSync(docsDir) && readdirSync(docsDir).length > 0) {
    logger.error(
      { docsDir, action: 'docs_pull_blocked' },
      'the docs folder has files but is not a git clone — move them away and run again',
    );
    process.exitCode = 1;
    return;
  }

  const branchArgs = env.DOCS_REPO_BRANCH ? ['--branch', env.DOCS_REPO_BRANCH] : [];
  // Shallow: ingestion only needs the current pages, not their history
  runGit(['clone', '--depth', '1', ...branchArgs, env.DOCS_REPO_URL, docsDir]);
  logger.info({ docsDir, action: 'docs_cloned' }, 'docs repo cloned');
}

try {
  main();
} catch (error) {
  logger.error(
    { err: error, action: 'docs_pull_failed' },
    'docs pull failed — see the git output above',
  );
  process.exitCode = 1;
}
