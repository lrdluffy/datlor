import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tokenStorage } from '../api/tokenStorage';

export function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated } = useAuth();
  const hasStoredSession = !!tokenStorage.getAccessToken();

  if (!isAuthenticated && !hasStoredSession) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
