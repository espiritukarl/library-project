import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Library from './pages/Library';
import Bookmarks from './pages/Bookmarks';
import Settings from './pages/Settings';
import Help from './pages/Help';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ProtectedRoute from './components/common/ProtectedRoute';
import Analytics from './pages/Analytics';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'discover', element: <Discover /> },
      { path: 'library', element: (<ProtectedRoute><Library /></ProtectedRoute>) },
      { path: 'bookmarks', element: <Bookmarks /> },
      { path: 'settings', element: <Settings /> },
      { path: 'help', element: <Help /> },
      { path: 'login', element: <LoginForm /> },
      { path: 'register', element: <RegisterForm /> },
      { path: 'analytics', element: (<ProtectedRoute><Analytics /></ProtectedRoute>) },
    ],
  },
]);
