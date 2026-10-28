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
  area: null,
  replyTo: null,

  // `area` is kept: the product filter applies across chats until the user changes it.
  resetChat: () =>
    set({
      conversationId: null,
      turns: [],
      stage: null,
      error: null,
      loadStatus: IDLE_STATUSES.idle,
      replyTo: null,
    }),

  showConversation: (conversationId, turns) =>
    set({
      conversationId,
      turns,
      stage: null,
      error: null,
      loadStatus: IDLE_STATUSES.success,
      replyTo: null,
    }),

  setConversationId: (conversationId) => set({ conversationId }),

  setLoadStatus: (loadStatus) => set({ loadStatus }),

  startTurn: (question, replyTo) =>
    set((state) => ({
      turns: [
        ...state.turns,
        {
          id: createUuid(),
          question,
          replyTo: replyTo?.quote ?? null,
          replyToId: replyTo?.answerId ?? null,
          answer: '',
          answerId: null,
          sources: [],
          notice: null,
          feedback: null,
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

  setTurnFeedback: (turnId, feedback) =>
    set((state) => ({
      turns: state.turns.map((turn) => (turn.id === turnId ? { ...turn, feedback } : turn)),
    })),

  setStage: (stage) => set({ stage }),

  setError: (error) => set({ error }),

  setArea: (area) => set({ area }),

  setReplyTo: (replyTo) => set({ replyTo }),
}));
