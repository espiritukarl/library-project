import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './components/common/ProtectedRoute';
import Loading from './components/common/Loading';

const App = lazy(() => import('./App'));
const Home = lazy(() => import('./pages/Home'));
const Discover = lazy(() => import('./pages/Discover'));
const Library = lazy(() => import('./pages/Library'));
const Bookmarks = lazy(() => import('./pages/Bookmarks'));
const Settings = lazy(() => import('./pages/Settings'));
const Help = lazy(() => import('./pages/Help'));
const LoginForm = lazy(() => import('./components/auth/LoginForm'));
const Analytics = lazy(() => import('./pages/Analytics'));

export const router = createBrowserRouter([
  { path: '/login', element: (
    <Suspense fallback={<Loading />}>
      <LoginForm />
    </Suspense>
  ) },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Loading />}>
          <App />
        </Suspense>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: (
        <Suspense fallback={<Loading />}>
          <Home />
        </Suspense>
      ) },
      { path: 'discover', element: (
        <Suspense fallback={<Loading />}>
          <Discover />
        </Suspense>
      ) },
      { path: 'library', element: (
        <Suspense fallback={<Loading />}>
          <Library />
        </Suspense>
      ) },
      { path: 'bookmarks', element: (
        <Suspense fallback={<Loading />}>
          <Bookmarks />
        </Suspense>
      ) },
      { path: 'settings', element: (
        <Suspense fallback={<Loading />}>
          <Settings />
        </Suspense>
      ) },
      { path: 'help', element: (
        <Suspense fallback={<Loading />}>
          <Help />
        </Suspense>
      ) },
      { path: 'analytics', element: (
        <Suspense fallback={<Loading />}>
          <Analytics />
        </Suspense>
      ) },
    ],
  },
]);
