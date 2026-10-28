import { type ChatSource, type ChatStage, type MessageFeedbackDto } from '@gap-product-guru/shared';
import { type IdleStatus } from '@/constants/loadingStatus';

export const TURN_STATUSES = {
  streaming: 'streaming',
  done: 'done',
  /** Stopped by the user — kept on screen but never saved on the server. */
  stopped: 'stopped',
  failed: 'failed',
} as const;

export type TurnStatus = (typeof TURN_STATUSES)[keyof typeof TURN_STATUSES];

/** What a reply quotes: the text, and the saved answer it came from (to scroll back to it). */
export type ReplyTarget = {
  quote: string;
  answerId: string | null;
};

/** A question and its answer — the server always stores them as a pair. */
export type ChatTurn = {
  id: string;
  question: string;
  /** The quoted part of an earlier answer this question replies to. */
  replyTo: string | null;
  /** Id of the answer `replyTo` was quoted from; null for older replies. */
  replyToId: string | null;
  answer: string;
  /** Id of the saved assistant message; null until the server has saved the turn. */
  answerId: string | null;
  sources: ChatSource[];
  notice: string | null;
  /** This browser's feedback on the answer. */
  feedback: MessageFeedbackDto | null;
  status: TurnStatus;
};

export type ChatError = {
  code: string;
  message: string;
  retryAfterSeconds?: number;
};

export type ChatState = {
  // State
  /** null = a new chat that has no saved answer yet. */
  conversationId: string | null;
  turns: ChatTurn[];
  /** Server-reported stage of the turn in flight, null when idle. */
  stage: ChatStage | null;
  error: ChatError | null;
  loadStatus: IdleStatus;
  /** Docs area the next questions are limited to (DocAreaDto.key); null = all products. */
  area: string | null;
  /** What the next question replies to, shown above the composer; null = a normal question. */
  replyTo: ReplyTarget | null;

  // Actions
  resetChat: () => void;
  showConversation: (conversationId: string, turns: ChatTurn[]) => void;
  setConversationId: (conversationId: string) => void;
  setLoadStatus: (status: IdleStatus) => void;
  startTurn: (question: string, replyTo: ReplyTarget | null) => void;
  updateLastTurn: (patch: Partial<ChatTurn>) => void;
  appendToLastTurn: (delta: string) => void;
  removeLastTurn: () => void;
  setTurnFeedback: (turnId: string, feedback: MessageFeedbackDto | null) => void;
  setStage: (stage: ChatStage | null) => void;
  setError: (error: ChatError | null) => void;
  setArea: (area: string | null) => void;
  setReplyTo: (replyTo: ReplyTarget | null) => void;
};
