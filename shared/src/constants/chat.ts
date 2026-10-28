/** Longest question the API accepts (characters). */
export const CHAT_MESSAGE_MAX_LENGTH = 4000;

/** Longest quote a reply may carry (characters) — longer selections are cut by the client. */
export const REPLY_QUOTE_MAX_LENGTH = 2000;

/** Longest note a report of an incorrect answer may carry (characters). */
export const FEEDBACK_NOTE_MAX_LENGTH = 2000;

/** Header carrying the anonymous per-browser id that scopes conversation history. */
export const CLIENT_ID_HEADER = 'X-Client-Id';

/** Final SSE payload of a successful chat stream. */
export const SSE_DONE = '[DONE]';
