import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** The server/ folder — same depth from src/config and dist/config. */
export const SERVER_ROOT = path.resolve(__dirname, '../../');

// Load the dev env file only in development (production gets real env vars or
// `node --env-file-if-exists=.env.production.local`; tests set their own in vitest.config.ts).
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: path.join(SERVER_ROOT, '.env.development.local') });
}

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(9005),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Database
  DATABASE_URL: z.url(),

  // Google Gemini — optional so the server can boot (and serve history) before a key is added
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_CHAT_MODEL: z.string().default('gemini-3.8-flash'),
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-2'),
  PRODUCT_NAME: z.string().default('the product'),

  // Retrieval
  RAG_TOP_K: z.coerce.number().int().min(1).max(20).default(8),
  CHAT_HISTORY_TURNS: z.coerce.number().int().min(0).max(10).default(3),

  // Ingestion
  DOCS_DIR: z.string().default('../data/docs'),
  // `pnpm docs:pull` clones this repo into DOCS_DIR; an empty branch means the remote's default
  DOCS_REPO_URL: z.string().optional(),
  DOCS_REPO_BRANCH: z.string().optional(),
  // The wiki in the browser — sources link to `<DOCS_WEB_URL>?pagePath=…`; empty = no links
  DOCS_WEB_URL: z.string().optional(),
  // Gemini's batch endpoint has historically capped requests at 100 items
  EMBED_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(50),

  // Rate limiting
  CHAT_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
