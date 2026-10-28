import { type FC, memo } from 'react';
import { CHAT_STAGES, type ChatStage } from '@gap-product-guru/shared';
import { Alert, Flex, Typography } from 'antd';
import { type ChatTurn, TURN_STATUSES } from '@/store/chat/types';
import { CHAT_COPY } from '@/constants/chat';
import { ChatStatus } from '@/components/chat/ChatStatus';
import { MarkdownMessage } from '@/components/chat/MarkdownMessage';
import { SourceList } from '@/components/chat/SourceList';

type Props = {
  turn: ChatTurn;
  /** Stage of the turn in flight; only passed to the last turn. */
  stage: ChatStage | null;
};

const AssistantMessage: FC<Props> = ({ turn, stage }) => {
  const isStreaming = turn.status === TURN_STATUSES.streaming;

  return (
    <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200/70">
      {isStreaming && !turn.answer && <ChatStatus stage={stage ?? CHAT_STAGES.retrieving} />}
      {turn.answer && (
        <MarkdownMessage content={turn.answer} sources={turn.sources} isStreaming={isStreaming} />
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
    </div>
  );
};

/** One question (right, brand bubble) and its answer (left, white card). */
export const ChatTurnItem = memo(function ChatTurnItem({ turn, stage }: Props) {
  return (
    <Flex vertical gap={12}>
      <div className="bg-primary max-w-[85%] self-end rounded-2xl rounded-br-sm px-4 py-2.5 break-words whitespace-pre-wrap text-white">
        {turn.question}
      </div>
      <AssistantMessage turn={turn} stage={stage} />
    </Flex>
  );
});
