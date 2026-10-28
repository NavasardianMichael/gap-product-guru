import { type FC, memo, useCallback, useRef } from 'react';
import { CHAT_STAGES, type ChatStage } from '@gap-product-guru/shared';
import { Alert, Flex, Typography } from 'antd';
import { type ChatTurn, TURN_STATUSES } from '@/store/chat/types';
import { CHAT_COPY, REPLY_COPY } from '@/constants/chat';
import { combineClassNames } from '@/helpers/common';
import { getAnswerElementId, scrollToAnswer } from '@/helpers/turns';
import { AnswerActions } from '@/components/chat/AnswerActions';
import { ChatStatus } from '@/components/chat/ChatStatus';
import { MarkdownMessage } from '@/components/chat/MarkdownMessage';
import { SourceList } from '@/components/chat/SourceList';

type Props = {
  turn: ChatTurn;
  /** Stage of the turn in flight; only passed to the last turn. */
  stage: ChatStage | null;
  /** Shared conversations: no reply or feedback actions. */
  readOnly?: boolean;
};

const AssistantMessage: FC<Props> = ({ turn, stage, readOnly }) => {
  const answerRef = useRef<HTMLDivElement>(null);
  const isStreaming = turn.status === TURN_STATUSES.streaming;
  const canAct = !readOnly && turn.status === TURN_STATUSES.done && Boolean(turn.answerId);

  return (
    <div
      id={turn.answerId ? getAnswerElementId(turn.answerId) : undefined}
      className="scroll-mt-4 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200/70"
    >
      {isStreaming && !turn.answer && <ChatStatus stage={stage ?? CHAT_STAGES.retrieving} />}
      {turn.answer && (
        <div ref={answerRef}>
          <MarkdownMessage content={turn.answer} sources={turn.sources} isStreaming={isStreaming} />
        </div>
      )}
      {turn.status === TURN_STATUSES.failed && !turn.answer && (
        <Typography.Text type="secondary">{CHAT_COPY.failedNote}</Typography.Text>
      )}
      {turn.notice && <Alert type="info" showIcon title={turn.notice} className="mt-3" />}
      {turn.status === TURN_STATUSES.stopped && (
        <Typography.Text type="secondary" className="mt-2 block text-xs">
          {CHAT_COPY.stoppedNote}
        </Typography.Text>
      )}
      <SourceList sources={turn.sources} answer={turn.answer} />
      {canAct && <AnswerActions turn={turn} answerRef={answerRef} />}
    </div>
  );
};

const QUOTE_CLASS = 'mb-1.5 line-clamp-3 border-l-2 border-white/60 pl-2 text-xs text-white/80';

/** The quote above a reply; clicking it scrolls to the answer it came from. */
const ReplyQuote: FC<{ quote: string; answerId: string | null }> = ({ quote, answerId }) => {
  const handleClick = useCallback(() => {
    if (answerId) scrollToAnswer(answerId);
  }, [answerId]);

  // Older replies don't know their answer — nothing to jump to
  if (!answerId) return <div className={QUOTE_CLASS}>{quote}</div>;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={REPLY_COPY.goToAnswer}
      className={combineClassNames([
        QUOTE_CLASS,
        'block w-full cursor-pointer text-left transition-colors hover:border-white hover:text-white',
      ])}
    >
      {quote}
    </button>
  );
};

/** One question (right, brand bubble) and its answer (left, white card). */
export const ChatTurnItem = memo(function ChatTurnItem({ turn, stage, readOnly }: Props) {
  return (
    <Flex vertical gap={12}>
      <div className="bg-primary max-w-[85%] self-end rounded-2xl rounded-br-sm px-4 py-2.5 break-words whitespace-pre-wrap text-white">
        {turn.replyTo && <ReplyQuote quote={turn.replyTo} answerId={turn.replyToId} />}
        {turn.question}
      </div>
      <AssistantMessage turn={turn} stage={stage} readOnly={readOnly} />
    </Flex>
  );
});
