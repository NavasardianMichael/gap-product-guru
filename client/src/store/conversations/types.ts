import { type ConversationSummary } from '@gap-product-guru/shared';
import { type IdleStatus } from '@/constants/loadingStatus';

export type ConversationsState = {
  // State
  conversations: ConversationSummary[];
  listStatus: IdleStatus;

  // Actions
  setConversations: (conversations: ConversationSummary[]) => void;
  setListStatus: (status: IdleStatus) => void;
  /** Inserts or refreshes a conversation and moves it to the top (most recently updated). */
  upsertConversation: (conversation: ConversationSummary) => void;
  removeConversation: (id: string) => void;
};
