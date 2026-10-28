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

export const FEEDBACK_COPY = {
  helpful: 'This answer helped',
  undoHelpful: 'Remove "helped"',
  report: 'Report misleading or incorrect info',
  reported: 'Reported — click to edit your report',
  reportTitle: 'Report this answer',
  reportIntro:
    'What is misleading or incorrect? Your note goes to the team that maintains the documentation.',
  reportPlaceholder:
    'e.g. These steps are for the old dashboard — the button is now under Settings › Access.',
  sendReport: 'Send report',
  reportSent: 'Thanks — your report was sent.',
  thanks: 'Thanks for the feedback!',
  failed: 'Could not save your feedback. Please try again.',
} as const;

export const REPLY_COPY = {
  reply: 'Reply',
  replyHint: 'Reply to this answer (select text first to quote only that part)',
  replyingTo: 'Replying to',
  goToAnswer: 'Go to the quoted answer',
  cancel: 'Cancel reply',
} as const;

export const AREA_COPY = {
  label: 'Search in',
  all: 'All products',
  pages: (count: number) => `${count} page${count === 1 ? '' : 's'}`,
  loadFailed: 'Could not load the product areas.',
} as const;

export const SHARE_COPY = {
  share: 'Share',
  title: 'Share this conversation',
  intro:
    'Anyone with the link can view this conversation as it is now. Messages you send after creating the link are not shared.',
  create: 'Create link',
  copy: 'Copy link',
  copied: 'Link copied',
  copyFailed: 'Copy the link from the box above.',
  createFailed: 'Could not create the link. Please try again.',
  sharedLabel: 'Shared conversation · read-only',
  sharedOn: (date: string) => `Shared ${date}`,
  snapshotNote: 'This is a snapshot — messages added after it was shared are not included.',
  continue: 'Continue this conversation',
  continueFailed: 'Could not copy the conversation. Please try again.',
  notFoundTitle: 'Link not found',
  notFoundBody: "This shared conversation doesn't exist or the link is incomplete.",
  goHome: 'Start a new chat',
} as const;

export const ADMIN_COPY = {
  title: 'Answer feedback',
  backToChat: 'Back to chat',
  refresh: 'Refresh',
  openReports: 'Open reports',
  resolvedReports: 'Resolved',
  helpful: 'Helpful',
  question: 'Question',
  note: 'Reporter’s note',
  noNote: 'No note was added.',
  answer: 'Answer',
  resolve: 'Mark resolved',
  reopen: 'Reopen',
  resolvedOn: (date: string) => `Resolved ${date}`,
  report: 'Report',
  helpfulTag: 'Helped',
  loadFailed: 'Could not load feedback.',
  updateFailed: 'Could not update the report.',
  emptyOpen: 'No open reports. 🎉',
  emptyResolved: 'No resolved reports yet.',
  emptyHelpful: 'No "helped" votes yet.',
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
