import { type ConversationsState } from './types';

// State selectors
export const selectConversations = (state: ConversationsState) => state.conversations;
export const selectListStatus = (state: ConversationsState) => state.listStatus;

// Action selectors
export const selectSetConversations = (state: ConversationsState) => state.setConversations;
export const selectSetListStatus = (state: ConversationsState) => state.setListStatus;
export const selectUpsertConversation = (state: ConversationsState) => state.upsertConversation;
export const selectRemoveConversation = (state: ConversationsState) => state.removeConversation;
