import { type FeedbackRequest, type MessageFeedbackDto } from '@gap-product-guru/shared';
import { apiRequest } from '@/helpers/api';
import { FEEDBACK_ENDPOINTS } from './endpoints';

/** Thumbs up or a report on one answer; replaces this browser's earlier feedback on it. */
export const saveFeedback = (
  messageId: string,
  feedback: FeedbackRequest,
): Promise<MessageFeedbackDto> =>
  apiRequest<MessageFeedbackDto>(FEEDBACK_ENDPOINTS.forMessage(messageId), {
    method: 'PUT',
    json: feedback,
  });

export const deleteFeedback = async (messageId: string): Promise<void> => {
  await apiRequest<{ id: string }>(FEEDBACK_ENDPOINTS.forMessage(messageId), {
    method: 'DELETE',
  });
};
