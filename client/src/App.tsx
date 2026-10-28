import { AntdProvider } from '@/components/antd/AntdProvider';
import { AppRouter } from '@/components/router/AppRouter';

function App() {
  return (
    <AntdProvider>
      <AppRouter />
    </AntdProvider>
  );
}

export default App;
