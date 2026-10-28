import { useCallback } from 'react';
import { FEEDBACK_RATINGS } from '@gap-product-guru/shared';
import { App } from 'antd';
import { deleteFeedback, saveFeedback } from '@/api/feedback';
import { selectSetTurnFeedback } from '@/store/chat/selectors';
import { useChatStore } from '@/store/chat/store';
import { type ChatTurn } from '@/store/chat/types';
import { FEEDBACK_COPY } from '@/constants/chat';

type UseFeedbackReturn = {
  /** Thumbs up, or takes it back when already given. */
  toggleHelpful: (turn: ChatTurn) => Promise<void>;
  /** Sends (or updates) a report; resolves to true when it was saved. */
  report: (turn: ChatTurn, note: string) => Promise<boolean>;
};

/** Saves this browser's feedback on answers and mirrors it into the chat store. */
export const useFeedback = (): UseFeedbackReturn => {
  const { message } = App.useApp();
  const setTurnFeedback = useChatStore(selectSetTurnFeedback);

  const toggleHelpful = useCallback(
    async (turn: ChatTurn) => {
      if (!turn.answerId) return;
      try {
        if (turn.feedback?.rating === FEEDBACK_RATINGS.helpful) {
          await deleteFeedback(turn.answerId);
          setTurnFeedback(turn.id, null);
          return;
        }
        const feedback = await saveFeedback(turn.answerId, { rating: FEEDBACK_RATINGS.helpful });
        setTurnFeedback(turn.id, feedback);
        message.success(FEEDBACK_COPY.thanks);
      } catch {
        message.error(FEEDBACK_COPY.failed);
      }
    },
    [message, setTurnFeedback],
  );

  const report = useCallback(
    async (turn: ChatTurn, note: string) => {
      if (!turn.answerId) return false;
      try {
        const feedback = await saveFeedback(turn.answerId, {
          rating: FEEDBACK_RATINGS.incorrect,
          ...(note.trim() && { note: note.trim() }),
        });
        setTurnFeedback(turn.id, feedback);
        message.success(FEEDBACK_COPY.reportSent);
        return true;
      } catch {
        message.error(FEEDBACK_COPY.failed);
        return false;
      }
    },
    [message, setTurnFeedback],
  );

  return { toggleHelpful, report };
};
