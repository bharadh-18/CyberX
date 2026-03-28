import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ShieldCheck, Lock, Globe, Zap, Network, LogOut, LogIn, LayoutGrid } from 'lucide-react';

export default function Navbar() {
  const { accessToken, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="nav-dock-wrapper">
      <nav className="nav-dock-container group">
        {/* Core Identity / Home */}
        <Link 
          to="/" 
          className={`nav-dock-item ${isActive('/') ? 'active' : ''}`}
          title="Home"
        >
          <ShieldCheck className="w-6 h-6 nav-dock-icon" />
        </Link>

        {accessToken ? (
          <>
            {/* Command Center */}
            <Link 
              to="/dashboard" 
              className={`nav-dock-item ${isActive('/dashboard') ? 'active' : ''}`}
              title="Command Center"
            >
              <LayoutGrid className="w-5 h-5 nav-dock-icon" />
            </Link>

            {/* Analyzer */}
            <Link 
              to="/analyzer" 
              className={`nav-dock-item ${isActive('/analyzer') ? 'active' : ''}`}
              title="Phishing Analyzer"
            >
              <Globe className="w-5 h-5 nav-dock-icon" />
            </Link>

            {/* Simulator */}
            <Link 
              to="/simulator" 
              className={`nav-dock-item ${isActive('/simulator') ? 'active' : ''}`}
              title="Attack Simulator"
            >
              <Zap className="w-5 h-5 nav-dock-icon" />
            </Link>

            {/* Scanner */}
            <Link 
              to="/scanner" 
              className={`nav-dock-item ${isActive('/scanner') ? 'active' : ''}`}
              title="Threat Scanner"
            >
              <Network className="w-5 h-5 nav-dock-icon" />
            </Link>

            {/* Admin (Conditional) */}
            {user?.roles?.includes('admin') && (
              <Link 
                to="/admin" 
                className={`nav-dock-item ${isActive('/admin') ? 'active' : ''}`}
                title="Admin Console"
              >
                <Lock className="w-5 h-5 nav-dock-icon text-amber-500" />
              </Link>
            )}

            {/* Logout */}
            <button 
              onClick={handleLogout}
              className="nav-dock-item hover:text-red-500 hover:bg-red-500/10"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5 nav-dock-icon" />
            </button>
          </>
        ) : (
          /* Login (Unauthenticated) */
          <Link 
            to="/login" 
            className={`nav-dock-item ${isActive('/login') ? 'active' : ''}`}
            title="Authenticate"
          >
            <LogIn className="w-5 h-5 nav-dock-icon" />
          </Link>
        )}
      </nav>
    </div>
  );
}
