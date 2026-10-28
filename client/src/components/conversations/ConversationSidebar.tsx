import { type FC } from 'react';
import { Drawer, Flex, Layout, Typography } from 'antd';
import { APP_NAME, SIDEBAR_WIDTH } from '@/constants/chat';
import {
  ConversationList,
  type ConversationListProps,
} from '@/components/conversations/ConversationList';

type Props = ConversationListProps & {
  /** Docked sider from `md` up, a drawer below. */
  isDocked: boolean;
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
};

const DRAWER_STYLES = { body: { padding: 0 } };

export const ConversationSidebar: FC<Props> = ({
  isDocked,
  isDrawerOpen,
  onCloseDrawer,
  ...listProps
}) => {
  if (!isDocked) {
    return (
      <Drawer
        open={isDrawerOpen}
        onClose={onCloseDrawer}
        placement="left"
        size={SIDEBAR_WIDTH}
        title={APP_NAME}
        styles={DRAWER_STYLES}
      >
        <ConversationList {...listProps} />
      </Drawer>
    );
  }

  return (
    <Layout.Sider width={SIDEBAR_WIDTH} theme="light" className="border-r border-gray-200">
      <Flex vertical className="h-full">
        <Flex align="center" gap={10} className="h-14 shrink-0 border-b border-gray-200 px-4!">
          <img src="/favicon.svg" alt="" className="size-7" />
          <Typography.Text strong className="text-base">
            {APP_NAME}
          </Typography.Text>
        </Flex>
        <div className="min-h-0 flex-1">
          <ConversationList {...listProps} />
        </div>
      </Flex>
    </Layout.Sider>
  );
};
