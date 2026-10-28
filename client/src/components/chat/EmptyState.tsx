import { type FC } from 'react';
import { Flex, Typography } from 'antd';
import { CHAT_COPY } from '@/constants/chat';

export const EmptyState: FC = () => (
  <Flex vertical align="center" justify="center" className="h-full px-6! text-center">
    <img src="/favicon.svg" alt="" className="mb-4 size-12" />
    <Typography.Title level={3} className="mb-1!">
      {CHAT_COPY.emptyTitle}
    </Typography.Title>
    <Typography.Paragraph type="secondary" className="max-w-md">
      {CHAT_COPY.emptyBody}
    </Typography.Paragraph>
  </Flex>
);
