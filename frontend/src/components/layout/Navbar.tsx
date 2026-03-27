import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ShieldAlert } from 'lucide-react';

export default function Navbar() {
  const { accessToken, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 h-16 bg-[rgba(10,14,26,0.85)] backdrop-blur-md border-b border-[var(--border-color)]">
      <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
        <ShieldAlert className="text-indigo-500 w-6 h-6" />
        <span>Sentinel<span className="text-indigo-500">Shield</span></span>
      </Link>
      
      <div className="flex gap-2">
        {accessToken ? (
          <>
            <Link to="/dashboard" className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors">Dashboard</Link>
            <Link to="/analyzer" className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors">Analyzer</Link>
            <Link to="/profile" className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors">Profile</Link>
            <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-md transition-colors">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors">Login</Link>
            <Link to="/register" className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors shadow-lg shadow-indigo-500/20">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
