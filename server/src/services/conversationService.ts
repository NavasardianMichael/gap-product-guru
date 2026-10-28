import {
  type ChatMessageDto,
  type ChatSource,
  type ConversationDetail,
  type ConversationSummary,
  ErrorCode,
  HttpStatus,
} from '@gap-product-guru/shared';

import { type Conversation, type Message } from '@/generated/prisma/client.js';
import { getDocWebUrl } from '@/lib/docLinks.js';
import { AppError } from '@/middleware/errorHandler.js';
import { conversationRepository } from '@/repositories/conversationRepository.js';

const notFound = () =>
  new AppError(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, 'Conversation not found');

export function toConversationSummary(conversation: Conversation): ConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

function toMessageDto(message: Message): ChatMessageDto {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    // Links are rebuilt on read, so older messages and a changed DOCS_WEB_URL still link correctly
    sources: ((message.sources as ChatSource[] | null) ?? []).map((source) => ({
      ...source,
      url: getDocWebUrl(source.path),
    })),
    createdAt: message.createdAt.toISOString(),
  };
}

export const conversationService = {
  async list(clientId: string): Promise<ConversationSummary[]> {
    const conversations = await conversationRepository.listByClient(clientId);
    return conversations.map(toConversationSummary);
  },

  async get(id: string, clientId: string): Promise<ConversationDetail> {
    const conversation = await conversationRepository.findWithMessages(id, clientId);
    if (!conversation) throw notFound();
    return {
      ...toConversationSummary(conversation),
      messages: conversation.messages.map(toMessageDto),
    };
  },

  /** Another browser's conversation id behaves exactly like a missing one. */
  async assertOwned(id: string, clientId: string): Promise<void> {
    const exists = await conversationRepository.existsForClient(id, clientId);
    if (!exists) throw notFound();
  },

  async remove(id: string, clientId: string): Promise<void> {
    const deleted = await conversationRepository.deleteForClient(id, clientId);
    if (deleted === 0) throw notFound();
  },
};
