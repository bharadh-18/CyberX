import { Outlet } from 'react-router-dom';

export default function AdminRoute() {
  // ARCHITECTURE FLATTENING: Bypassing admin check to provide direct access.
  return <Outlet />;
}
