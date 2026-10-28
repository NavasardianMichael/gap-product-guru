import { type ChatState, TURN_STATUSES } from './types';

// State selectors
export const selectConversationId = (state: ChatState) => state.conversationId;
export const selectTurns = (state: ChatState) => state.turns;
export const selectStage = (state: ChatState) => state.stage;
export const selectError = (state: ChatState) => state.error;
export const selectLoadStatus = (state: ChatState) => state.loadStatus;
export const selectIsStreaming = (state: ChatState) =>
  state.turns.at(-1)?.status === TURN_STATUSES.streaming;

// Action selectors
export const selectResetChat = (state: ChatState) => state.resetChat;
export const selectShowConversation = (state: ChatState) => state.showConversation;
export const selectSetConversationId = (state: ChatState) => state.setConversationId;
export const selectSetLoadStatus = (state: ChatState) => state.setLoadStatus;
export const selectStartTurn = (state: ChatState) => state.startTurn;
export const selectUpdateLastTurn = (state: ChatState) => state.updateLastTurn;
export const selectAppendToLastTurn = (state: ChatState) => state.appendToLastTurn;
export const selectRemoveLastTurn = (state: ChatState) => state.removeLastTurn;
export const selectSetStage = (state: ChatState) => state.setStage;
export const selectSetError = (state: ChatState) => state.setError;
