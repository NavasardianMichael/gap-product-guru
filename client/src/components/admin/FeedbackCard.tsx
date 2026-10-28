import { type FC, memo, useCallback, useMemo, useState } from 'react';
import { CheckOutlined, RedoOutlined } from '@ant-design/icons';
import { type AdminFeedbackItem, FEEDBACK_RATINGS } from '@gap-product-guru/shared';
import { Button, Card, Collapse, Flex, Tag, Typography } from 'antd';
import { ADMIN_COPY } from '@/constants/chat';
import { MarkdownMessage } from '@/components/chat/MarkdownMessage';
import { SourceList } from '@/components/chat/SourceList';

type Props = {
  item: AdminFeedbackItem;
  onSetResolved: (id: string, resolved: boolean) => Promise<void>;
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** One report (or "helped" vote) with the question, the reporter's note and the answer. */
export const FeedbackCard: FC<Props> = memo(function FeedbackCard({ item, onSetResolved }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const isReport = item.rating === FEEDBACK_RATINGS.incorrect;
  const isResolved = Boolean(item.resolvedAt);

  const toggleResolved = useCallback(async () => {
    setIsUpdating(true);
    await onSetResolved(item.id, !isResolved);
    setIsUpdating(false);
  }, [isResolved, item.id, onSetResolved]);

  const answerItems = useMemo(
    () => [
      {
        key: 'answer',
        label: ADMIN_COPY.answer,
        children: (
          <>
            <MarkdownMessage content={item.answer} sources={item.sources} isStreaming={false} />
            <SourceList sources={item.sources} answer={item.answer} />
          </>
        ),
      },
    ],
    [item.answer, item.sources],
  );

  return (
    <Card size="small">
      <Flex align="center" gap={8} wrap className="mb-2">
        <Tag color={isReport ? 'red' : 'green'}>
          {isReport ? ADMIN_COPY.report : ADMIN_COPY.helpfulTag}
        </Tag>
        <Typography.Text type="secondary" className="text-xs">
          {formatDate(item.createdAt)}
        </Typography.Text>
        {item.resolvedAt && (
          <Typography.Text type="secondary" className="text-xs">
            · {ADMIN_COPY.resolvedOn(formatDate(item.resolvedAt))}
          </Typography.Text>
        )}
        {isReport && (
          <Button
            size="small"
            icon={isResolved ? <RedoOutlined /> : <CheckOutlined />}
            loading={isUpdating}
            onClick={toggleResolved}
            className="ml-auto"
          >
            {isResolved ? ADMIN_COPY.reopen : ADMIN_COPY.resolve}
          </Button>
        )}
      </Flex>

      <Typography.Text type="secondary" className="block text-xs">
        {ADMIN_COPY.question}
      </Typography.Text>
      <Typography.Paragraph strong className="mb-2! whitespace-pre-wrap">
        {item.question}
      </Typography.Paragraph>

      {isReport && (
        <div className="mb-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
          <Typography.Text type="secondary" className="block text-xs">
            {ADMIN_COPY.note}
          </Typography.Text>
          <Typography.Text
            italic={!item.note}
            type={item.note ? undefined : 'secondary'}
            className="whitespace-pre-wrap"
          >
            {item.note ?? ADMIN_COPY.noNote}
          </Typography.Text>
        </div>
      )}

      <Collapse size="small" ghost items={answerItems} />
    </Card>
  );
});
