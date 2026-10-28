import { type ErrorCodeType } from './api.js';

export const CHAT_STAGES = {
  retrieving: 'retrieving',
  generating: 'generating',
} as const;

export type ChatStage = (typeof CHAT_STAGES)[keyof typeof CHAT_STAGES];

export const MESSAGE_ROLES = {
  user: 'user',
  assistant: 'assistant',
} as const;

export type MessageRole = (typeof MESSAGE_ROLES)[keyof typeof MESSAGE_ROLES];

/** A documentation chunk an answer was grounded on. `n` is the number the answer cites as `[n]`. */
export type ChatSource = {
  n: number;
  /** File path relative to the docs folder, always with forward slashes. */
  path: string;
  title: string;
  /** Heading breadcrumb inside the file, e.g. `Setup › Windows`. */
  heading: string;
  /** The page in the docs wiki, or null when the server has no `DOCS_WEB_URL`. */
  url: string | null;
  /** Cosine similarity to the question, 0–1. */
  score: number;
};

export type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type ChatMessageDto = {
  id: string;
  role: MessageRole;
  content: string;
  sources: ChatSource[];
  createdAt: string;
};

export type ConversationDetail = ConversationSummary & {
  messages: ChatMessageDto[];
};

export type ChatStreamError = {
  code: ErrorCodeType;
  message: string;
  retryAfterSeconds?: number;
};

/**
 * One SSE `data:` payload sent by POST /api/chat. Exactly one key per frame.
 * The stream always ends with the literal `data: [DONE]` (see `SSE_DONE`) unless an `error` frame came first.
 * Wire format and ordering: docs/STREAMING_PROTOCOL.md.
 */
export type ChatStreamFrame =
  | { status: ChatStage }
  | { sources: ChatSource[] }
  | { delta: string }
  | { notice: string }
  | { conversation: ConversationSummary }
  | { error: ChatStreamError };
