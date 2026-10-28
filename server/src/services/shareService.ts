import {
  type ChatSource,
  type ConversationSummary,
  ErrorCode,
  HttpStatus,
  type MessageRole,
  type SharedConversationDto,
  type ShareLinkDto,
} from '@gap-product-guru/shared';

import { logger } from '@/lib/logger.js';
import { AppError } from '@/middleware/errorHandler.js';
import { conversationRepository } from '@/repositories/conversationRepository.js';
import { shareRepository } from '@/repositories/shareRepository.js';
import { toConversationSummary, withSourceLinks } from '@/services/conversationService.js';

/** One message as stored in `shared_conversations.messages`. */
type SharedMessage = {
  id: string;
  role: MessageRole;
  content: string;
  sources: ChatSource[] | null;
  /** Absent in snapshots made before replies existed. */
  replyTo?: string | null;
  /** Points at another message of the same snapshot (original ids are kept). */
  replyToId?: string | null;
  createdAt: string;
};

const notFound = (what: string) =>
  new AppError(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, `${what} not found`);

async function findSnapshot(shareId: string) {
  const share = await shareRepository.findById(shareId);
  if (!share) throw notFound('Shared conversation');
  return { ...share, messages: share.messages as SharedMessage[] };
}

export const shareService = {
  /**
   * Snapshots one of this browser's conversations as it is now (like ChatGPT/Gemini share links):
   * messages added later are not shared, and each call creates a new link.
   */
  async create(conversationId: string, clientId: string): Promise<ShareLinkDto> {
    const conversation = await conversationRepository.findWithMessages(conversationId, clientId);
    if (!conversation) throw notFound('Conversation');

    const messages: SharedMessage[] = conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      sources: message.sources as ChatSource[] | null,
      replyTo: message.replyTo,
      replyToId: message.replyToId,
      createdAt: message.createdAt.toISOString(),
    }));
    const share = await shareRepository.create({
      clientId,
      conversationId,
      title: conversation.title,
      messages,
    });
    logger.info(
      { conversationId, shareId: share.id, action: 'conversation_shared' },
      'link created',
    );
    return { shareId: share.id };
  },

  /** Public, read-only — no client id needed. */
  async get(shareId: string): Promise<SharedConversationDto> {
    const share = await findSnapshot(shareId);
    return {
      id: share.id,
      title: share.title,
      sharedAt: share.createdAt.toISOString(),
      messages: share.messages.map((message) => ({
        ...message,
        sources: withSourceLinks(message.sources),
        replyTo: message.replyTo ?? null,
        replyToId: message.replyToId ?? null,
        feedback: null,
      })),
    };
  },

  /** Copies the snapshot into this browser's own conversations so it can ask follow-ups. */
  async continue(shareId: string, clientId: string): Promise<ConversationSummary> {
    const share = await findSnapshot(shareId);
    const conversation = await conversationRepository.createWithMessages(
      clientId,
      share.title,
      share.messages.map(({ id, role, content, sources, replyTo, replyToId }) => ({
        id,
        role,
        content,
        sources,
        replyTo: replyTo ?? null,
        replyToId: replyToId ?? null,
      })),
    );
    logger.info(
      { shareId, conversationId: conversation.id, action: 'shared_conversation_continued' },
      'shared conversation copied',
    );
    return toConversationSummary(conversation);
  },
};
