import { type FC, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { ADMIN_FEEDBACK_VIEWS, type AdminFeedbackView } from '@gap-product-guru/shared';
import { Button, Empty, Flex, Layout, Segmented, Typography } from 'antd';
import { useAdminFeedback } from '@/hooks/useAdminFeedback';
import { ADMIN_COPY, APP_NAME } from '@/constants/chat';
import { IDLE_STATUSES } from '@/constants/loadingStatus';
import { ROUTES } from '@/constants/routes';
import { FeedbackCard } from '@/components/admin/FeedbackCard';
import { PageLoader } from '@/components/shared/PageLoader';

const VIEW_LABELS: Record<AdminFeedbackView, string> = {
  open: ADMIN_COPY.openReports,
  resolved: ADMIN_COPY.resolvedReports,
  helpful: ADMIN_COPY.helpful,
};

const EMPTY_TEXT: Record<AdminFeedbackView, string> = {
  open: ADMIN_COPY.emptyOpen,
  resolved: ADMIN_COPY.emptyResolved,
  helpful: ADMIN_COPY.emptyHelpful,
};

/** /admin — reports of misleading or incorrect answers, and "helped" votes. Open to anyone. */
const AdminPage: FC = () => {
  const [view, setView] = useState<AdminFeedbackView>(ADMIN_FEEDBACK_VIEWS.open);
  const { list, status, reload, setResolved } = useAdminFeedback(view);

  const viewOptions = useMemo(
    () =>
      Object.values(ADMIN_FEEDBACK_VIEWS).map((value) => ({
        value,
        label: list ? `${VIEW_LABELS[value]} (${list.summary[value]})` : VIEW_LABELS[value],
      })),
    [list],
  );

  return (
    <Layout className="h-dvh">
      <Flex
        align="center"
        gap={10}
        className="h-14 shrink-0 border-b border-gray-200 bg-white px-4!"
      >
        <img src="/favicon.svg" alt="" className="size-7" />
        <Typography.Text strong className="min-w-0 flex-1 text-base">
          {APP_NAME} · {ADMIN_COPY.title}
        </Typography.Text>
        <Link to={ROUTES.HOME}>
          <Button type="text" icon={<ArrowLeftOutlined />}>
            {ADMIN_COPY.backToChat}
          </Button>
        </Link>
      </Flex>

      <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
          <Flex align="center" justify="space-between" gap={8} wrap>
            <Segmented<AdminFeedbackView> value={view} options={viewOptions} onChange={setView} />
            <Button icon={<ReloadOutlined />} onClick={reload}>
              {ADMIN_COPY.refresh}
            </Button>
          </Flex>

          {status === IDLE_STATUSES.pending && !list && <PageLoader />}
          {list && list.items.length === 0 && <Empty description={EMPTY_TEXT[view]} />}
          {list?.items.map((item) => (
            <FeedbackCard key={item.id} item={item} onSetResolved={setResolved} />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default AdminPage;
