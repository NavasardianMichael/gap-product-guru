import { type ConversationDetail, type ConversationSummary } from '@gap-product-guru/shared';
import { apiRequest } from '@/helpers/api';
import { CONVERSATION_ENDPOINTS } from './endpoints';

/** This browser's conversations, newest first. */
export const fetchConversations = (): Promise<ConversationSummary[]> =>
  apiRequest<ConversationSummary[]>(CONVERSATION_ENDPOINTS.list);

/** One conversation with all its messages, oldest first. */
export const fetchConversation = (id: string): Promise<ConversationDetail> =>
  apiRequest<ConversationDetail>(CONVERSATION_ENDPOINTS.byId(id));

export const deleteConversation = async (id: string): Promise<void> => {
  await apiRequest<{ id: string }>(CONVERSATION_ENDPOINTS.byId(id), { method: 'DELETE' });
};
