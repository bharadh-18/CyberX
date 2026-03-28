import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, Globe, Zap, Network, LayoutGrid } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

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

        {/* Admin Console */}
        <Link 
          to="/admin" 
          className={`nav-dock-item ${isActive('/admin') ? 'active' : ''}`}
          title="Admin Console"
        >
          <Lock className="w-5 h-5 nav-dock-icon text-amber-500" />
        </Link>
      </nav>
    </div>
  );
}
