import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function AdminRoute() {
  const { accessToken, user } = useAuthStore();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.roles?.includes('admin')) {
    // Normal users attempting to access admin route get redirected to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
