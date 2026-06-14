// Wraps routes that require authentication.
// While auth state is rehydrating, renders nothing (or a minimal loader) to
// avoid flashing a redirect to /login on a hard refresh of a protected page.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    // Pass the attempted location so LoginPage can return the user here on success.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
