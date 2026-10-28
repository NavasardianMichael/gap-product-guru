import { randomUUID } from 'node:crypto';
import { type ChatSource } from '@gap-product-guru/shared';

import { prisma } from '@/db/index.js';
import {
  type Conversation,
  type Message,
  type MessageFeedback,
  type MessageRole,
} from '@/generated/prisma/client.js';

/** `feedback` holds only the requesting browser's own feedback (0 or 1 row). */
export type MessageWithFeedback = Message & {
  feedback: Pick<MessageFeedback, 'rating' | 'note'>[];
};

export type ConversationWithMessages = Conversation & { messages: MessageWithFeedback[] };

export type SavedTurn = {
  conversation: Conversation;
  /** Id of the stored assistant message. */
  answerId: string;
};

export type MessageCopy = {
  /** The original id — only used to re-point `replyToId` at the copy. */
  id: string;
  role: MessageRole;
  content: string;
  sources: ChatSource[] | null;
  replyTo: string | null;
  replyToId: string | null;
};

export type TurnSave = {
  /** Omit to create the conversation (first answered question of a new chat). */
  conversationId?: string;
  clientId: string;
  title: string;
  question: string;
  /** The quoted part of an earlier answer the question replies to. */
  replyTo?: string;
  /** Id of the answer `replyTo` was quoted from. */
  replyToId?: string;
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
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { feedback: { where: { clientId }, select: { rating: true, note: true } } },
        },
      },
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
    replyTo,
    replyToId,
    answer,
    sources,
  }: TurnSave): Promise<SavedTurn> {
    const askedAt = new Date();
    const answeredAt = new Date(askedAt.getTime() + 1); // keeps the pair's order stable
    // Chosen here because createMany does not return ids; the client needs it for feedback
    const answerId = randomUUID();

    const conversation = await prisma.$transaction(async (tx) => {
      const conversation = conversationId
        ? await tx.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: answeredAt },
          })
        : await tx.conversation.create({ data: { clientId, title } });

      await tx.message.createMany({
        data: [
          {
            conversationId: conversation.id,
            role: 'user',
            content: question,
            replyTo,
            replyToId,
            createdAt: askedAt,
          },
          {
            id: answerId,
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

    return { conversation, answerId };
  },

  /**
   * A new conversation holding copies of `messages`, in order (used to continue a shared chat).
   * Copies get new ids, so each `replyToId` is re-pointed at the copy of the answer it quoted.
   */
  async createWithMessages(
    clientId: string,
    title: string,
    messages: MessageCopy[],
  ): Promise<Conversation> {
    const start = Date.now();
    const newIds = new Map(messages.map((message) => [message.id, randomUUID()]));
    return prisma.conversation.create({
      data: {
        clientId,
        title,
        messages: {
          createMany: {
            data: messages.map(({ id, role, content, sources, replyTo, replyToId }, index) => ({
              id: newIds.get(id),
              role,
              content,
              sources: sources ?? undefined,
              replyTo,
              replyToId: replyToId ? (newIds.get(replyToId) ?? null) : null,
              createdAt: new Date(start + index), // keeps the copied order stable
            })),
          },
        },
      },
    });
  },

  /** An assistant message in one of this browser's conversations, with the question before it. */
  async findAnswerWithQuestion(
    messageId: string,
    clientId: string,
  ): Promise<{ answer: Message; question: Message | null } | null> {
    const answer = await prisma.message.findFirst({
      where: { id: messageId, role: 'assistant', conversation: { clientId } },
    });
    if (!answer) return null;

    const question = await prisma.message.findFirst({
      where: {
        conversationId: answer.conversationId,
        role: 'user',
        createdAt: { lt: answer.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { answer, question };
  },

  async deleteForClient(id: string, clientId: string): Promise<number> {
    const { count } = await prisma.conversation.deleteMany({ where: { id, clientId } });
    return count;
  },
};
