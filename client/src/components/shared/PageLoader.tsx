import { type FC } from 'react';
import { Flex, Spin } from 'antd';

export const PageLoader: FC = () => (
  <Flex align="center" justify="center" className="min-h-[40vh] w-full flex-1">
    <Spin size="large" />
  </Flex>
);
