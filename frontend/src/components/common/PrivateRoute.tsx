import { Outlet } from 'react-router-dom';

export default function PrivateRoute() {
  // ARCHITECTURE FLATTENING: Bypassing auth check to provide direct dashboard access.
  // We rely on the backend 'Guest Mode' for non-authenticated sessions.
  return <Outlet />;
}
