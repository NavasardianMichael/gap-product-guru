import { type ChatSource, type ChatStage } from '@gap-product-guru/shared';
import { type IdleStatus } from '@/constants/loadingStatus';

export const TURN_STATUSES = {
  streaming: 'streaming',
  done: 'done',
  /** Stopped by the user — kept on screen but never saved on the server. */
  stopped: 'stopped',
  failed: 'failed',
} as const;

export type TurnStatus = (typeof TURN_STATUSES)[keyof typeof TURN_STATUSES];

/** A question and its answer — the server always stores them as a pair. */
export type ChatTurn = {
  id: string;
  question: string;
  answer: string;
  sources: ChatSource[];
  notice: string | null;
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

  // Actions
  resetChat: () => void;
  showConversation: (conversationId: string, turns: ChatTurn[]) => void;
  setConversationId: (conversationId: string) => void;
  setLoadStatus: (status: IdleStatus) => void;
  startTurn: (question: string) => void;
  updateLastTurn: (patch: Partial<ChatTurn>) => void;
  appendToLastTurn: (delta: string) => void;
  removeLastTurn: () => void;
  setStage: (stage: ChatStage | null) => void;
  setError: (error: ChatError | null) => void;
};
