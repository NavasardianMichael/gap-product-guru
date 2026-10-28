import {
  ADMIN_FEEDBACK_VIEWS,
  type AdminFeedbackView,
  type ChatSource,
} from '@gap-product-guru/shared';

import { prisma } from '@/db/index.js';
import {
  type FeedbackRating,
  type MessageFeedback,
  type Prisma,
} from '@/generated/prisma/client.js';

export type FeedbackSave = {
  messageId: string;
  clientId: string;
  rating: FeedbackRating;
  note: string | null;
  question: string;
  answer: string;
  sources: ChatSource[];
};

const ADMIN_LIST_LIMIT = 200;

const VIEW_FILTERS: Record<AdminFeedbackView, Prisma.MessageFeedbackWhereInput> = {
  [ADMIN_FEEDBACK_VIEWS.open]: { rating: 'incorrect', resolvedAt: null },
  [ADMIN_FEEDBACK_VIEWS.resolved]: { rating: 'incorrect', resolvedAt: { not: null } },
  [ADMIN_FEEDBACK_VIEWS.helpful]: { rating: 'helpful' },
};

export const feedbackRepository = {
  /** One row per browser and answer; giving feedback again replaces it and reopens a report. */
  async upsert({ messageId, clientId, ...fields }: FeedbackSave): Promise<MessageFeedback> {
    const data = { ...fields, resolvedAt: null };
    return prisma.messageFeedback.upsert({
      where: { messageId_clientId: { messageId, clientId } },
      create: { messageId, clientId, ...data },
      update: data,
    });
  },

  async deleteForClient(messageId: string, clientId: string): Promise<number> {
    const { count } = await prisma.messageFeedback.deleteMany({ where: { messageId, clientId } });
    return count;
  },

  async listForView(view: AdminFeedbackView): Promise<MessageFeedback[]> {
    return prisma.messageFeedback.findMany({
      where: VIEW_FILTERS[view],
      orderBy: { createdAt: 'desc' },
      take: ADMIN_LIST_LIMIT,
    });
  },

  async countPerView(): Promise<Record<AdminFeedbackView, number>> {
    const [open, resolved, helpful] = await Promise.all([
      prisma.messageFeedback.count({ where: VIEW_FILTERS.open }),
      prisma.messageFeedback.count({ where: VIEW_FILTERS.resolved }),
      prisma.messageFeedback.count({ where: VIEW_FILTERS.helpful }),
    ]);
    return { open, resolved, helpful };
  },

  /** Returns null when the feedback does not exist. */
  async setResolved(id: string, resolved: boolean): Promise<MessageFeedback | null> {
    const { count } = await prisma.messageFeedback.updateMany({
      where: { id },
      data: { resolvedAt: resolved ? new Date() : null },
    });
    return count === 0 ? null : prisma.messageFeedback.findUnique({ where: { id } });
  },
};
