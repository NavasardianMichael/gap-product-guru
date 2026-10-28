import {
  type AdminFeedbackItem,
  type AdminFeedbackList,
  type AdminFeedbackView,
  ErrorCode,
  FEEDBACK_RATINGS,
  type FeedbackRequest,
  HttpStatus,
  type MessageFeedbackDto,
} from '@gap-product-guru/shared';

import { type MessageFeedback } from '@/generated/prisma/client.js';
import { logger } from '@/lib/logger.js';
import { AppError } from '@/middleware/errorHandler.js';
import { conversationRepository } from '@/repositories/conversationRepository.js';
import { feedbackRepository } from '@/repositories/feedbackRepository.js';
import { withSourceLinks } from '@/services/conversationService.js';

const notFound = (what: string) =>
  new AppError(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, `${what} not found`);

function toAdminItem(feedback: MessageFeedback): AdminFeedbackItem {
  return {
    id: feedback.id,
    rating: feedback.rating,
    note: feedback.note,
    question: feedback.question,
    answer: feedback.answer,
    sources: withSourceLinks(feedback.sources),
    createdAt: feedback.createdAt.toISOString(),
    resolvedAt: feedback.resolvedAt?.toISOString() ?? null,
  };
}

export const feedbackService = {
  /** Thumbs up or a report on one of this browser's answers; replaces any earlier feedback. */
  async give(
    messageId: string,
    clientId: string,
    { rating, note }: FeedbackRequest,
  ): Promise<MessageFeedbackDto> {
    const turn = await conversationRepository.findAnswerWithQuestion(messageId, clientId);
    if (!turn) throw notFound('Answer');

    const keptNote = rating === FEEDBACK_RATINGS.incorrect ? note || null : null;
    await feedbackRepository.upsert({
      messageId,
      clientId,
      rating,
      note: keptNote,
      question: turn.question?.content ?? '',
      answer: turn.answer.content,
      sources: withSourceLinks(turn.answer.sources),
    });
    logger.info({ messageId, rating, action: 'feedback_given' }, 'feedback given');
    return { rating, note: keptNote };
  },

  async remove(messageId: string, clientId: string): Promise<void> {
    const deleted = await feedbackRepository.deleteForClient(messageId, clientId);
    if (deleted === 0) throw notFound('Feedback');
  },

  async listForAdmin(view: AdminFeedbackView): Promise<AdminFeedbackList> {
    const [summary, items] = await Promise.all([
      feedbackRepository.countPerView(),
      feedbackRepository.listForView(view),
    ]);
    return { summary, items: items.map(toAdminItem) };
  },

  async setResolved(id: string, resolved: boolean): Promise<AdminFeedbackItem> {
    const feedback = await feedbackRepository.setResolved(id, resolved);
    if (!feedback) throw notFound('Feedback');
    logger.info({ feedbackId: id, resolved, action: 'feedback_resolved' }, 'feedback resolved');
    return toAdminItem(feedback);
  },
};
