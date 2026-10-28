import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { PageLoader } from '@/components/shared/PageLoader';
import AppErrorPage from '@/pages/AppErrorPage';

const ChatPage = lazy(() => import('@/pages/ChatPage'));

function AppLayout() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  );
}

// Both chat routes render ChatPage; React keeps the same instance when switching between them,
// so a new chat's URL change (/ → /c/:id) does not interrupt its stream.
const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <AppErrorPage />,
    children: [
      { path: ROUTES.HOME, element: <ChatPage /> },
      { path: ROUTES.CONVERSATION, element: <ChatPage /> },
      { path: '*', element: <Navigate to={ROUTES.HOME} replace /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
