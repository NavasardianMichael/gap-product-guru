import { type FC, type MouseEvent, type RefObject, useCallback, useState } from 'react';
import {
  CommentOutlined,
  FlagFilled,
  FlagOutlined,
  LikeFilled,
  LikeOutlined,
} from '@ant-design/icons';
import { FEEDBACK_RATINGS } from '@gap-product-guru/shared';
import { Button, Flex, Tooltip } from 'antd';
import { selectSetReplyTo } from '@/store/chat/selectors';
import { useChatStore } from '@/store/chat/store';
import { type ChatTurn } from '@/store/chat/types';
import { useFeedback } from '@/hooks/useFeedback';
import { FEEDBACK_COPY, REPLY_COPY } from '@/constants/chat';
import { toReplyQuote } from '@/helpers/turns';
import { ReportModal } from '@/components/chat/ReportModal';

type Props = {
  turn: ChatTurn;
  /** The rendered answer — a text selection inside it becomes the reply quote. */
  answerRef: RefObject<HTMLDivElement | null>;
};

/** Keeps the user's text selection alive while the button is pressed. */
const keepSelection = (event: MouseEvent) => event.preventDefault();

/** Reply, "helped" and "report" under a saved answer. */
export const AnswerActions: FC<Props> = ({ turn, answerRef }) => {
  const { toggleHelpful, report } = useFeedback();
  const setReplyTo = useChatStore(selectSetReplyTo);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const isHelpful = turn.feedback?.rating === FEEDBACK_RATINGS.helpful;
  const isReported = turn.feedback?.rating === FEEDBACK_RATINGS.incorrect;

  const handleReply = useCallback(() => {
    const selection = window.getSelection();
    const isInAnswer = Boolean(selection && answerRef.current?.contains(selection.anchorNode));
    setReplyTo({
      quote: toReplyQuote(turn.answer, isInAnswer ? (selection?.toString() ?? '') : ''),
      answerId: turn.answerId,
    });
    selection?.removeAllRanges();
  }, [answerRef, setReplyTo, turn.answer, turn.answerId]);

  const handleHelpful = useCallback(() => void toggleHelpful(turn), [toggleHelpful, turn]);
  const openReport = useCallback(() => setIsReportOpen(true), []);
  const closeReport = useCallback(() => setIsReportOpen(false), []);
  const handleReport = useCallback((note: string) => report(turn, note), [report, turn]);

  return (
    <>
      <Flex align="center" gap={2} className="mt-2 -ml-2">
        <Tooltip title={isHelpful ? FEEDBACK_COPY.undoHelpful : FEEDBACK_COPY.helpful}>
          <Button
            type="text"
            size="small"
            icon={isHelpful ? <LikeFilled className="text-primary" /> : <LikeOutlined />}
            onClick={handleHelpful}
            aria-label={FEEDBACK_COPY.helpful}
            aria-pressed={isHelpful}
          />
        </Tooltip>
        <Tooltip title={isReported ? FEEDBACK_COPY.reported : FEEDBACK_COPY.report}>
          <Button
            type="text"
            size="small"
            icon={isReported ? <FlagFilled className="text-red-500" /> : <FlagOutlined />}
            onClick={openReport}
            aria-label={FEEDBACK_COPY.report}
            aria-pressed={isReported}
          />
        </Tooltip>
        <Tooltip title={REPLY_COPY.replyHint}>
          <Button
            type="text"
            size="small"
            icon={<CommentOutlined />}
            onMouseDown={keepSelection}
            onClick={handleReply}
            aria-label={REPLY_COPY.reply}
          />
        </Tooltip>
      </Flex>
      {isReportOpen && (
        <ReportModal
          initialNote={turn.feedback?.note ?? ''}
          onClose={closeReport}
          onSubmit={handleReport}
        />
      )}
    </>
  );
};
