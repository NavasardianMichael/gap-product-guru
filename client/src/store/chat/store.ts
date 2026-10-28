import { create } from 'zustand';
import { IDLE_STATUSES } from '@/constants/loadingStatus';
import { createUuid } from '@/helpers/clientId';
import { type ChatState, type ChatTurn, TURN_STATUSES } from './types';

const mapLastTurn = (turns: ChatTurn[], update: (turn: ChatTurn) => ChatTurn): ChatTurn[] =>
  turns.length === 0 ? turns : [...turns.slice(0, -1), update(turns[turns.length - 1])];

export const useChatStore = create<ChatState>((set) => ({
  conversationId: null,
  turns: [],
  stage: null,
  error: null,
  loadStatus: IDLE_STATUSES.idle,

  resetChat: () =>
    set({
      conversationId: null,
      turns: [],
      stage: null,
      error: null,
      loadStatus: IDLE_STATUSES.idle,
    }),

  showConversation: (conversationId, turns) =>
    set({ conversationId, turns, stage: null, error: null, loadStatus: IDLE_STATUSES.success }),

  setConversationId: (conversationId) => set({ conversationId }),

  setLoadStatus: (loadStatus) => set({ loadStatus }),

  startTurn: (question) =>
    set((state) => ({
      turns: [
        ...state.turns,
        {
          id: createUuid(),
          question,
          answer: '',
          sources: [],
          notice: null,
          status: TURN_STATUSES.streaming,
        },
      ],
    })),

  updateLastTurn: (patch) =>
    set((state) => ({ turns: mapLastTurn(state.turns, (turn) => ({ ...turn, ...patch })) })),

  appendToLastTurn: (delta) =>
    set((state) => ({
      turns: mapLastTurn(state.turns, (turn) => ({ ...turn, answer: turn.answer + delta })),
    })),

  removeLastTurn: () => set((state) => ({ turns: state.turns.slice(0, -1) })),

  setStage: (stage) => set({ stage }),

  setError: (error) => set({ error }),
}));
