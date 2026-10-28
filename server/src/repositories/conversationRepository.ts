import { type ChatSource } from '@gap-product-guru/shared';

import { prisma } from '@/db/index.js';
import { type Conversation, type Message } from '@/generated/prisma/client.js';

export type ConversationWithMessages = Conversation & { messages: Message[] };

export type TurnSave = {
  /** Omit to create the conversation (first answered question of a new chat). */
  conversationId?: string;
  clientId: string;
  title: string;
  question: string;
  answer: string;
  sources: ChatSource[];
};

const CONVERSATION_LIST_LIMIT = 100;

export const conversationRepository = {
  async listByClient(clientId: string): Promise<Conversation[]> {
    return prisma.conversation.findMany({
      where: { clientId },
      orderBy: { updatedAt: 'desc' },
      take: CONVERSATION_LIST_LIMIT,
    });
  },

  async existsForClient(id: string, clientId: string): Promise<boolean> {
    const count = await prisma.conversation.count({ where: { id, clientId } });
    return count > 0;
  },

  async findWithMessages(id: string, clientId: string): Promise<ConversationWithMessages | null> {
    return prisma.conversation.findFirst({
      where: { id, clientId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  },

  /** The last `take` messages, oldest first. */
  async findRecentMessages(conversationId: string, take: number): Promise<Message[]> {
    if (take === 0) return [];
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return messages.reverse();
  },

  /**
   * Stores a question and its answer together (and creates the conversation if needed).
   * Writing both at the end of a successful answer is what keeps Retry from duplicating turns
   * and keeps the history strictly alternating user → assistant.
   */
  async saveTurn({
    conversationId,
    clientId,
    title,
    question,
    answer,
    sources,
  }: TurnSave): Promise<Conversation> {
    const askedAt = new Date();
    const answeredAt = new Date(askedAt.getTime() + 1); // keeps the pair's order stable

    return prisma.$transaction(async (tx) => {
      const conversation = conversationId
        ? await tx.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: answeredAt },
          })
        : await tx.conversation.create({ data: { clientId, title } });

      await tx.message.createMany({
        data: [
          { conversationId: conversation.id, role: 'user', content: question, createdAt: askedAt },
          {
            conversationId: conversation.id,
            role: 'assistant',
            content: answer,
            sources,
            createdAt: answeredAt,
          },
        ],
      });

      return conversation;
    });
  },

  async deleteForClient(id: string, clientId: string): Promise<number> {
    const { count } = await prisma.conversation.deleteMany({ where: { id, clientId } });
    return count;
  },
};
