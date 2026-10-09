import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { token, user } = useAuth();
  const location = useLocation();

  if (!token || !user) {
    // Save current location so LoginPage knows where to return
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
