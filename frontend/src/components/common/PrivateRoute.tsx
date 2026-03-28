import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function PrivateRoute() {
  const { accessToken, isProfileCreated } = useAuthStore();
  
  // Guard evaluation: Must have token AND confirmed Neon DB profile
  if (!accessToken || !isProfileCreated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
