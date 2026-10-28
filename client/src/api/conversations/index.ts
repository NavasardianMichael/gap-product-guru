import {
  type ApiResponse,
  type ConversationDetail,
  type ConversationSummary,
} from '@gap-product-guru/shared';
import { apiHeaders, toApiRequestError } from '@/helpers/error';
import { CONVERSATION_ENDPOINTS } from './endpoints';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { ...apiHeaders(), ...init?.headers } });
  if (!response.ok) throw await toApiRequestError(response);
  const body = (await response.json()) as ApiResponse<T>;
  return body.data;
}

/** This browser's conversations, newest first. */
export const fetchConversations = (): Promise<ConversationSummary[]> =>
  request<ConversationSummary[]>(CONVERSATION_ENDPOINTS.list);

/** One conversation with all its messages, oldest first. */
export const fetchConversation = (id: string): Promise<ConversationDetail> =>
  request<ConversationDetail>(CONVERSATION_ENDPOINTS.byId(id));

export const deleteConversation = async (id: string): Promise<void> => {
  await request<{ id: string }>(CONVERSATION_ENDPOINTS.byId(id), { method: 'DELETE' });
};
