import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ShieldAlert } from 'lucide-react';

export default function Navbar() {
  const { accessToken, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 h-18 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-light)] shadow-sm animate-fade-up">
      <Link to="/" className="flex items-center gap-3 text-2xl font-black tracking-tighter hover:scale-105 transition-transform">
        <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
          <ShieldAlert className="text-indigo-500 w-6 h-6" />
        </div>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Cyber<span className="text-indigo-500">X</span></span>
      </Link>
      
      <div className="flex gap-1.5 items-center">
        {accessToken ? (
          <>
            <Link to="/dashboard" className="px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Dashboard</Link>
            <Link to="/analyzer" className="px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Analyzer</Link>
            <Link to="/simulator" className="px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Simulator</Link>
            <Link to="/scanner" className="px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Scanner</Link>
            {user?.roles?.includes('admin') && (
              <Link to="/admin" className="px-5 py-2.5 text-sm font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] rounded-lg transition-all border border-transparent hover:border-amber-500/30">Admin</Link>
            )}
            <div className="w-px h-6 bg-white/10 mx-2" />
            <Link to="/profile" className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Profile</Link>
            <button onClick={handleLogout} className="px-4 py-2.5 text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-primary text-sm py-2 px-5 !font-semibold flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/></svg>
              Sign In
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
