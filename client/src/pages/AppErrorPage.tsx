import { type FC, useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { Button, Flex, Result } from 'antd';
import { ROUTES } from '@/constants/routes';

const AppErrorPage: FC = () => {
  const error = useRouteError();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Flex vertical align="center" justify="center" className="min-h-screen w-full">
      <Result
        status="500"
        title="Something went wrong"
        extra={[
          <Button
            type="dashed"
            key="home"
            onClick={() => {
              window.location.href = ROUTES.HOME;
            }}
          >
            Start over
          </Button>,
          <Button type="dashed" key="reload" onClick={() => window.location.reload()}>
            Reload
          </Button>,
        ]}
      />
    </Flex>
  );
};

export default AppErrorPage;
