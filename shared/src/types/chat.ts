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

export const FEEDBACK_RATINGS = {
  /** "This answer helped" (thumbs up). */
  helpful: 'helpful',
  /** A report of misleading or incorrect information, reviewed in the admin panel. */
  incorrect: 'incorrect',
} as const;

export type FeedbackRatingType = (typeof FEEDBACK_RATINGS)[keyof typeof FEEDBACK_RATINGS];

/** This browser's own feedback on one answer. */
export type MessageFeedbackDto = {
  rating: FeedbackRatingType;
  note: string | null;
};

export type ChatMessageDto = {
  id: string;
  role: MessageRole;
  content: string;
  sources: ChatSource[];
  /** The quoted part of an earlier answer this question replies to — user messages only. */
  replyTo: string | null;
  /** Id of the answer the quote came from (null for replies saved before this was stored). */
  replyToId: string | null;
  /** This browser's feedback — assistant messages only, always null in shared conversations. */
  feedback: MessageFeedbackDto | null;
  createdAt: string;
};

export type ConversationDetail = ConversationSummary & {
  messages: ChatMessageDto[];
};

/** A read-only snapshot of a conversation, as it was when its link was created. */
export type SharedConversationDto = {
  id: string;
  title: string;
  sharedAt: string;
  messages: ChatMessageDto[];
};

export type ShareLinkDto = {
  shareId: string;
};

/** A top-level section of the docs wiki, used to narrow retrieval. */
export type DocAreaDto = {
  /** The top-level folder (or root page) name, e.g. `Breakthrough-Execution-Software`. */
  key: string;
  /** Readable name, e.g. `Breakthrough Execution Software`. */
  name: string;
  pages: number;
};

// ─── Admin ───

export const ADMIN_FEEDBACK_VIEWS = {
  open: 'open',
  resolved: 'resolved',
  helpful: 'helpful',
} as const;

export type AdminFeedbackView = (typeof ADMIN_FEEDBACK_VIEWS)[keyof typeof ADMIN_FEEDBACK_VIEWS];

/** One piece of feedback with the question and answer it was about, copied when it was given. */
export type AdminFeedbackItem = {
  id: string;
  rating: FeedbackRatingType;
  note: string | null;
  question: string;
  answer: string;
  sources: ChatSource[];
  createdAt: string;
  resolvedAt: string | null;
};

export type AdminFeedbackList = {
  summary: Record<AdminFeedbackView, number>;
  items: AdminFeedbackItem[];
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
  /** Id of the saved assistant message — what feedback is attached to. Sent just before `conversation`. */
  | { answerId: string }
  | { conversation: ConversationSummary }
  | { error: ChatStreamError };
