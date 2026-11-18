import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from './session';

export function RequireAuth() {
  const session = useSession();
  const location = useLocation();

  if (session === undefined) return null;
  if (session === null) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
