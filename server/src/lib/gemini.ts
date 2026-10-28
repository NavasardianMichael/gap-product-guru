import { ErrorCode, HttpStatus } from '@gap-product-guru/shared';
import { ApiError, type GenerateContentConfig, GoogleGenAI, ThinkingLevel } from '@google/genai';

import { env } from '@/config/env.js';
import { AppError } from '@/middleware/errorHandler.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Must match `vector(768)` in prisma/schema.prisma — changing it means a migration and a full re-ingest. */
export const EMBEDDING_DIMENSIONS = 768;

const MAX_OUTPUT_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_RETRY_AFTER_SECONDS = 60;

/** Gemini's 429 body carries `"retryDelay":"37s"` inside a google.rpc.RetryInfo detail. */
const RETRY_DELAY_PATTERN = /"retryDelay":\s*"(\d+(?:\.\d+)?)s"/;
/** Daily quotas have ids like `GenerateRequestsPerDayPerProjectPerModel-FreeTier`. */
const DAILY_QUOTA_PATTERN = /PerDay/;
const UNAVAILABLE_STATUSES = new Set([500, 502, 503, 504]);

// ─── Client ──────────────────────────────────────────────────────────────────

let client: GoogleGenAI | null = null;

/** Created lazily so the server boots (and serves history) before a key is configured. */
export function getGemini(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(
      HttpStatus.SERVICE_UNAVAILABLE,
      ErrorCode.AI_UNAVAILABLE,
      'GEMINI_API_KEY is not set on the server.',
    );
  }

  client ??= new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
    httpOptions: {
      timeout: REQUEST_TIMEOUT_MS,
      // Retry transient 5xx only. 429 is left out on purpose — without an explicit list the SDK
      // would retry it too, burning quota; callers surface it with Gemini's own retryDelay instead.
      retryOptions: { attempts: 3, httpStatusCodes: [500, 502, 503, 504] },
    },
  });
  return client;
}

// ─── Embeddings ──────────────────────────────────────────────────────────────

/**
 * gemini-embedding-2 has no `taskType`; documents and queries are marked with these
 * prompt prefixes instead (https://ai.google.dev/gemini-api/docs/embeddings).
 */
export function toDocumentEmbeddingText(title: string, heading: string, content: string): string {
  const breadcrumb = heading ? `${heading}\n\n` : '';
  return `title: ${title} | text: ${breadcrumb}${content}`;
}

export function toQueryEmbeddingText(query: string): string {
  return `task: search result | query: ${query}`;
}

/** One vector per input text, in order. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await getGemini().models.embedContent({
    model: env.GEMINI_EMBEDDING_MODEL,
    // One Content per text. A plain string[] would be merged into ONE aggregated embedding.
    contents: texts.map((text) => ({ parts: [{ text }] })),
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  const vectors = response.embeddings?.map((embedding) => embedding.values ?? []) ?? [];
  const isComplete =
    vectors.length === texts.length &&
    vectors.every((vector) => vector.length === EMBEDDING_DIMENSIONS);
  if (!isComplete) {
    throw new Error(
      `Expected ${texts.length} embeddings of ${EMBEDDING_DIMENSIONS} dims, got ${vectors.length}`,
    );
  }
  return vectors;
}

// ─── Generation ──────────────────────────────────────────────────────────────

/**
 * Gemini 2.5 takes a thinking *budget* (0 = off, fastest first token). Gemini 3.x takes a
 * thinking *level*, rejects a budget next to it, and loops at low temperatures — so it keeps
 * its default temperature. See docs/GEMINI_MODELS_AND_QUOTAS.md.
 */
export function buildGenerationConfig(model: string): GenerateContentConfig {
  if (model.startsWith('gemini-2.5')) {
    return {
      temperature: 0.2,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      thinkingConfig: { thinkingBudget: 0 },
    };
  }
  return {
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
  };
}

// ─── Errors ──────────────────────────────────────────────────────────────────

/**
 * Maps a Gemini SDK error to an AppError the chat route and ingest CLI can act on.
 * Returns null for anything that is not a recognised Gemini failure.
 * Both HTTP errors and errors inside a stream arrive as `ApiError` with the JSON body in `message`.
 */
export function toAiError(error: unknown): AppError | null {
  if (error instanceof AppError) return error;

  // REQUEST_TIMEOUT_MS hit — usually an overloaded model whose 5xx retries ran past the limit.
  // A client disconnect also aborts, but the chat route handles that before mapping errors.
  if (error instanceof Error && error.name === 'AbortError') {
    return new AppError(
      HttpStatus.SERVICE_UNAVAILABLE,
      ErrorCode.AI_UNAVAILABLE,
      'Gemini did not respond in time — it is probably overloaded. Please try again.',
    );
  }

  if (!(error instanceof ApiError)) return null;

  if (error.status === HttpStatus.TOO_MANY_REQUESTS) {
    // Daily-quota 429s also carry a retryDelay, so they must be detected first.
    if (DAILY_QUOTA_PATTERN.test(error.message)) {
      return new AppError(
        HttpStatus.TOO_MANY_REQUESTS,
        ErrorCode.AI_QUOTA_EXHAUSTED,
        "Today's free Gemini quota is used up. It resets at midnight Pacific time.",
      );
    }
    const match = RETRY_DELAY_PATTERN.exec(error.message);
    const retryAfterSeconds = match ? Math.ceil(Number(match[1])) : DEFAULT_RETRY_AFTER_SECONDS;
    return new AppError(
      HttpStatus.TOO_MANY_REQUESTS,
      ErrorCode.AI_RATE_LIMITED,
      "Gemini's free-tier rate limit was reached. Please wait a moment and retry.",
      undefined,
      retryAfterSeconds,
    );
  }

  if (UNAVAILABLE_STATUSES.has(error.status)) {
    return new AppError(
      HttpStatus.SERVICE_UNAVAILABLE,
      ErrorCode.AI_UNAVAILABLE,
      'Gemini is temporarily unavailable. Please try again.',
    );
  }

  if (/API key/i.test(error.message)) {
    return new AppError(
      HttpStatus.SERVICE_UNAVAILABLE,
      ErrorCode.AI_UNAVAILABLE,
      'Gemini rejected the API key configured on the server.',
    );
  }

  return null;
}
