import { type FC, type PropsWithChildren } from 'react';
import { App as AntApp, ConfigProvider } from 'antd';
import { theme } from '@/styles/antd-theme';

const ANT_APP_MESSAGE_PROPS = {
  duration: 4,
  top: 24,
};

export const AntdProvider: FC<PropsWithChildren> = ({ children }) => (
  <ConfigProvider theme={theme}>
    <AntApp message={ANT_APP_MESSAGE_PROPS} className="h-full">
      {children}
    </AntApp>
  </ConfigProvider>
);
