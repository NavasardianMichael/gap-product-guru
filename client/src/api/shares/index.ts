import {
  type ConversationSummary,
  type SharedConversationDto,
  type ShareLinkDto,
} from '@gap-product-guru/shared';
import { apiRequest } from '@/helpers/api';
import { SHARE_ENDPOINTS } from './endpoints';

/** A new read-only snapshot link of one of this browser's conversations. */
export const createShareLink = (conversationId: string): Promise<ShareLinkDto> =>
  apiRequest<ShareLinkDto>(SHARE_ENDPOINTS.create(conversationId), { method: 'POST' });

export const fetchSharedConversation = (shareId: string): Promise<SharedConversationDto> =>
  apiRequest<SharedConversationDto>(SHARE_ENDPOINTS.byId(shareId));

/** Copies a shared conversation into this browser's conversations. */
export const continueSharedConversation = (shareId: string): Promise<ConversationSummary> =>
  apiRequest<ConversationSummary>(SHARE_ENDPOINTS.continue(shareId), { method: 'POST' });
