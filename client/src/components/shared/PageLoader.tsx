import { type FC } from 'react';
import { Flex, Spin } from 'antd';

/**
 * Spinner centred on the viewport, wherever it is rendered (page load, opening a conversation,
 * shared link, admin). `pointer-events-none` keeps the sidebar and header usable underneath.
 */
export const PageLoader: FC = () => (
  <Flex align="center" justify="center" className="pointer-events-none fixed inset-0 z-10">
    <Spin size="large" />
  </Flex>
);
