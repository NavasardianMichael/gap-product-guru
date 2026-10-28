export type ApiResponse<T = unknown> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    /** Seconds until the request may be retried — only present on rate-limit errors. */
    retryAfterSeconds?: number;
  };
};

export type ApiResult<T = unknown> = ApiResponse<T> | ApiError;

// Error codes for client handling
export const ErrorCode = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // General errors
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  NOT_FOUND: 'NOT_FOUND',
  /** Our own per-IP limiter on POST /api/chat (protects the shared Gemini quota). */
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // Retrieval / Gemini errors
  /** No embedded chunks yet — `pnpm ingest` has not been run (or did not finish). */
  DOCS_NOT_INDEXED: 'DOCS_NOT_INDEXED',
  /** Gemini's per-minute free-tier limit was hit; retry after `retryAfterSeconds`. */
  AI_RATE_LIMITED: 'AI_RATE_LIMITED',
  /** Gemini's per-day free-tier quota is used up; it resets at midnight Pacific time. */
  AI_QUOTA_EXHAUSTED: 'AI_QUOTA_EXHAUSTED',
  /** Gemini is overloaded, unreachable, or not configured (missing/invalid API key). */
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
