import { type FC, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessageOutlined } from '@ant-design/icons';
import { Button, Flex, Layout, Result, Typography } from 'antd';
import { useSharedConversation } from '@/hooks/useSharedConversation';
import { APP_NAME, SHARE_COPY } from '@/constants/chat';
import { IDLE_STATUSES } from '@/constants/loadingStatus';
import { ROUTES } from '@/constants/routes';
import { toTurns } from '@/helpers/turns';
import { ChatTurnItem } from '@/components/chat/ChatTurnItem';
import { PageLoader } from '@/components/shared/PageLoader';

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** /share/:shareId — a read-only snapshot anyone with the link can open and continue. */
const SharedConversationPage: FC = () => {
  const { shareId } = useParams();
  const { shared, status, isContinuing, continueConversation } = useSharedConversation(shareId);
  const turns = useMemo(() => (shared ? toTurns(shared.messages) : []), [shared]);
  const handleContinue = useCallback(() => void continueConversation(), [continueConversation]);

  if (status === IDLE_STATUSES.pending) return <PageLoader />;

  if (!shared) {
    return (
      <Result
        status="404"
        title={SHARE_COPY.notFoundTitle}
        subTitle={SHARE_COPY.notFoundBody}
        extra={
          <Link to={ROUTES.HOME}>
            <Button type="primary">{SHARE_COPY.goHome}</Button>
          </Link>
        }
      />
    );
  }

  return (
    <Layout className="h-dvh">
      <Flex
        align="center"
        gap={10}
        className="h-14 shrink-0 border-b border-gray-200 bg-white px-4!"
      >
        <Link to={ROUTES.HOME} className="shrink-0" aria-label={APP_NAME}>
          <img src="/favicon.svg" alt="" className="size-7" />
        </Link>
        <div className="min-w-0 flex-1">
          <Typography.Text strong ellipsis className="block">
            {shared.title}
          </Typography.Text>
          <Typography.Text type="secondary" className="block text-xs">
            {SHARE_COPY.sharedLabel} · {SHARE_COPY.sharedOn(formatDate(shared.sharedAt))}
          </Typography.Text>
        </div>
      </Flex>

      <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
          {turns.map((turn) => (
            <ChatTurnItem key={turn.id} turn={turn} stage={null} readOnly />
          ))}
        </div>
      </div>

      <Flex
        vertical
        align="center"
        gap={8}
        className="shrink-0 border-t border-gray-200 bg-white px-4! py-3!"
      >
        <Typography.Text type="secondary" className="text-center text-xs">
          {SHARE_COPY.snapshotNote}
        </Typography.Text>
        <Button
          type="primary"
          icon={<MessageOutlined />}
          loading={isContinuing}
          onClick={handleContinue}
        >
          {SHARE_COPY.continue}
        </Button>
      </Flex>
    </Layout>
  );
};

export default SharedConversationPage;
