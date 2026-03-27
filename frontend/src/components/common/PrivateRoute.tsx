import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function PrivateRoute() {
  const { accessToken } = useAuthStore();
  
  // Basic guard evaluating whether the token exists in the store
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
