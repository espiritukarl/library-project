import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Loading from './Loading';
import type { PropsWithChildren } from 'react';

export default function ProtectedRoute({ children }: PropsWithChildren) {
  const { user, initialized } = useAuth();
  const loc = useLocation();
  if (!initialized) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}
