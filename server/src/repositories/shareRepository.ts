import { prisma } from '@/db/index.js';
import { type Prisma, type SharedConversation } from '@/generated/prisma/client.js';

export type ShareCreate = {
  clientId: string;
  conversationId: string;
  title: string;
  messages: Prisma.InputJsonValue;
};

export const shareRepository = {
  async create(data: ShareCreate): Promise<SharedConversation> {
    return prisma.sharedConversation.create({ data });
  },

  async findById(id: string): Promise<SharedConversation | null> {
    return prisma.sharedConversation.findUnique({ where: { id } });
  },
};
