import { create } from 'zustand';
import { IDLE_STATUSES } from '@/constants/loadingStatus';
import { type ConversationsState } from './types';

export const useConversationsStore = create<ConversationsState>((set) => ({
  conversations: [],
  listStatus: IDLE_STATUSES.idle,

  setConversations: (conversations) => set({ conversations }),

  setListStatus: (listStatus) => set({ listStatus }),

  upsertConversation: (conversation) =>
    set((state) => ({
      conversations: [
        conversation,
        ...state.conversations.filter((existing) => existing.id !== conversation.id),
      ],
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((conversation) => conversation.id !== id),
    })),
}));
