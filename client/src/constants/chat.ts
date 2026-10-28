import { type ChatStage, ErrorCode } from '@gap-product-guru/shared';

export const APP_NAME = 'Gap Product Guru';

/** Width of the conversation sidebar / drawer, px. */
export const SIDEBAR_WIDTH = 280;

/** Client-side error code for "the request never reached the server". */
export const NETWORK_ERROR_CODE = 'NETWORK_ERROR';

export const CHAT_COPY = {
  newChat: 'New chat',
  emptyTitle: 'Ask the product documentation',
  emptyBody:
    'Answers come only from the official documentation, with numbered sources you can check.',
  composerPlaceholder: 'Ask a question…  (Enter to send, Shift+Enter for a new line)',
  composerLabel: 'Your question',
  send: 'Send',
  stop: 'Stop',
  retry: 'Retry',
  sources: 'Sources',
  stoppedNote: 'Stopped — this answer was not saved.',
  failedNote: 'No answer — see the message below.',
  conversations: 'Conversations',
  noConversations: 'No conversations yet. Ask your first question!',
  deleteConfirm: 'Delete this conversation?',
  delete: 'Delete',
  cancel: 'Cancel',
  deleted: 'Conversation deleted',
  loadFailed: 'Could not load that conversation.',
  listFailed: 'Could not load your conversations.',
  deleteFailed: 'Could not delete the conversation.',
  copy: 'Copy',
  copied: 'Copied',
  code: 'code',
  openMenu: 'Open conversations',
} as const;

export const STAGE_LABELS: Record<ChatStage, string> = {
  retrieving: 'Searching the documentation…',
  generating: 'Writing the answer…',
};

export const ERROR_TITLES: Record<string, string> = {
  [ErrorCode.RATE_LIMITED]: 'Slow down a little',
  [ErrorCode.AI_RATE_LIMITED]: 'Gemini rate limit reached',
  [ErrorCode.AI_QUOTA_EXHAUSTED]: 'Daily limit reached',
  [ErrorCode.AI_UNAVAILABLE]: 'Gemini is unavailable',
  [ErrorCode.DOCS_NOT_INDEXED]: 'Documentation not indexed yet',
  [NETWORK_ERROR_CODE]: 'Connection problem',
};

export const ERROR_COPY = {
  genericTitle: 'Something went wrong',
  networkMessage: "Couldn't reach the server. Check your connection and retry.",
  retryIn: (seconds: number) => `Retry in ${seconds}s`,
} as const;

/** Errors that mean "wait", shown as warnings rather than failures. */
export const WAIT_ERROR_CODES: ReadonlySet<string> = new Set([
  ErrorCode.RATE_LIMITED,
  ErrorCode.AI_RATE_LIMITED,
  ErrorCode.AI_QUOTA_EXHAUSTED,
]);
