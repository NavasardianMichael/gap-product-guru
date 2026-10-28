// `pnpm ingest` — sync DOCS_DIR into Postgres and embed every chunk that has no vector yet.
// `pnpm ingest:dry` — chunk everything and print stats; no database writes, no Gemini calls.
// Safe to re-run at any time: unchanged files are skipped and embedding resumes where it stopped.
// Walkthrough and troubleshooting: docs/INGESTION.md.

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { ErrorCode } from '@gap-product-guru/shared';

import { env, SERVER_ROOT } from '@/config/env.js';
import { prisma } from '@/db/index.js';
import { CHUNK_MAX_TOKENS, CHUNKER_VERSION, chunkMarkdown } from '@/ingest/markdownChunker.js';
import { type DocFile, scanDocs } from '@/ingest/scanDocs.js';
import { getDocArea } from '@/lib/docAreas.js';
import { embedTexts, toAiError, toDocumentEmbeddingText } from '@/lib/gemini.js';
import { logger } from '@/lib/logger.js';
import { chunkRepository } from '@/repositories/chunkRepository.js';
import { documentRepository } from '@/repositories/documentRepository.js';

/** Give up after this many back-to-back rate-limit waits (Gemini is clearly saturated). */
const MAX_CONSECUTIVE_RATE_LIMITS = 10;

const isDryRun = process.argv.includes('--dry-run');
const docsDir = path.resolve(SERVER_ROOT, env.DOCS_DIR);

/** Changes when the file, the chunker rules or the embedding model change — any of which needs new vectors. */
function hashDocument(markdown: string): string {
  return createHash('sha256')
    .update(`${CHUNKER_VERSION}\n${env.GEMINI_EMBEDDING_MODEL}\n${markdown}`)
    .digest('hex');
}

// ─── Dry run ─────────────────────────────────────────────────────────────────

async function printDryRunStats(files: DocFile[]): Promise<void> {
  const tokenCounts: number[] = [];
  const largestDocs: { path: string; chunks: number }[] = [];

  for (const file of files) {
    const { chunks } = chunkMarkdown(await readFile(file.absolutePath, 'utf8'), file.path);
    tokenCounts.push(...chunks.map((chunk) => chunk.tokenCount));
    largestDocs.push({ path: file.path, chunks: chunks.length });
  }

  const totalTokens = tokenCounts.reduce((sum, tokens) => sum + tokens, 0);
  logger.info(
    {
      files: files.length,
      chunks: tokenCounts.length,
      totalTokens,
      avgChunkTokens: Math.round(totalTokens / Math.max(1, tokenCounts.length)),
      maxChunkTokens: Math.max(0, ...tokenCounts),
      chunkLimitTokens: CHUNK_MAX_TOKENS,
      embedRequests: Math.ceil(tokenCounts.length / env.EMBED_BATCH_SIZE),
      mostChunkedFiles: largestDocs.sort((a, b) => b.chunks - a.chunks).slice(0, 5),
    },
    'dry run — nothing written, no Gemini calls',
  );
}

// ─── Sync files → documents/chunks ───────────────────────────────────────────

async function syncDocuments(files: DocFile[]): Promise<void> {
  const knownHashes = new Map(
    (await documentRepository.findAllHashes()).map((doc) => [doc.path, doc.contentHash]),
  );
  const counts = { added: 0, updated: 0, unchanged: 0, removed: 0 };

  for (const file of files) {
    const markdown = await readFile(file.absolutePath, 'utf8');
    const contentHash = hashDocument(markdown);
    const previousHash = knownHashes.get(file.path);

    if (previousHash === contentHash) {
      counts.unchanged++;
      continue;
    }

    const { title, chunks } = chunkMarkdown(markdown, file.path);
    await documentRepository.replace({
      path: file.path,
      title,
      area: getDocArea(file.path),
      contentHash,
      chunks,
    });
    if (previousHash) counts.updated++;
    else counts.added++;
  }

  const onDisk = new Set(files.map((file) => file.path));
  const removedPaths = [...knownHashes.keys()].filter((docPath) => !onDisk.has(docPath));
  counts.removed = await documentRepository.deleteByPaths(removedPaths);

  logger.info(counts, 'documents synced');
}

// ─── Embed chunks that have no vector yet ────────────────────────────────────

async function embedMissingChunks(): Promise<void> {
  const total = await chunkRepository.countMissingEmbeddings();
  if (total === 0) {
    logger.info('all chunks already embedded');
    return;
  }
  logger.info({ chunks: total, batchSize: env.EMBED_BATCH_SIZE }, 'embedding chunks');

  let embedded = 0;
  let consecutiveRateLimits = 0;

  while (true) {
    const batch = await chunkRepository.findMissingEmbeddings(env.EMBED_BATCH_SIZE);
    if (batch.length === 0) break;

    try {
      const vectors = await embedTexts(
        batch.map((chunk) => toDocumentEmbeddingText(chunk.title, chunk.heading, chunk.content)),
      );
      await chunkRepository.saveEmbeddings(
        batch.map((chunk, index) => ({ id: chunk.id, embedding: vectors[index] })),
      );
      embedded += batch.length;
      consecutiveRateLimits = 0;
      logger.info({ embedded, total }, 'embedded batch');
    } catch (error) {
      const aiError = toAiError(error);

      if (aiError?.code === ErrorCode.AI_QUOTA_EXHAUSTED) {
        logger.warn(
          { embedded, remaining: total - embedded },
          "today's free embedding quota is used up — progress is saved; run `pnpm ingest` again after midnight Pacific",
        );
        return;
      }

      if (
        aiError?.code === ErrorCode.AI_RATE_LIMITED &&
        consecutiveRateLimits < MAX_CONSECUTIVE_RATE_LIMITS
      ) {
        consecutiveRateLimits++;
        const waitSeconds = aiError.retryAfterSeconds ?? 60;
        logger.warn({ waitSeconds, embedded, total }, 'rate limited by Gemini — waiting');
        await sleep(waitSeconds * 1000);
        continue;
      }

      throw aiError ?? error;
    }
  }

  logger.info(
    { embedded, totalEmbedded: await chunkRepository.countEmbedded() },
    'embedding finished',
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  let files: DocFile[];
  try {
    files = await scanDocs(docsDir);
  } catch {
    logger.error({ docsDir }, 'docs folder not found — run `pnpm docs:pull` or set DOCS_DIR');
    process.exitCode = 1;
    return;
  }

  if (files.length === 0) {
    logger.warn({ docsDir }, 'no .md files found in the docs folder');
    return;
  }
  logger.info({ docsDir, files: files.length }, isDryRun ? 'ingest (dry run)' : 'ingest');

  if (isDryRun) {
    await printDryRunStats(files);
    return;
  }

  await syncDocuments(files);
  await embedMissingChunks();
}

main()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'ingest failed');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
