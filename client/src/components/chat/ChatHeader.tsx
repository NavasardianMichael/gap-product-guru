import { type FC } from 'react';
import { MenuOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { CHAT_COPY } from '@/constants/chat';

type Props = {
  title: string;
  /** Mobile only: opens the conversations drawer. */
  onOpenMenu?: () => void;
};

export const ChatHeader: FC<Props> = ({ title, onOpenMenu }) => (
  <Flex align="center" gap={8} className="h-14 shrink-0 border-b border-gray-200 bg-white px-4!">
    {onOpenMenu && (
      <Button
        type="text"
        icon={<MenuOutlined />}
        onClick={onOpenMenu}
        aria-label={CHAT_COPY.openMenu}
      />
    )}
    <Typography.Text strong ellipsis className="min-w-0 flex-1">
      {title}
    </Typography.Text>
  </Flex>
);
