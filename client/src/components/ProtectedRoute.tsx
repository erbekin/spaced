import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { token, user, isLoading } = useAuth();
  const location = useLocation();

  // Wait for the session restore (refresh + /me) before deciding
  if (isLoading) {
    return <p className="text-sm text-gray-400">Loading...</p>;
  }

  if (!token || !user) {
    // Save current location so LoginPage knows where to return
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
