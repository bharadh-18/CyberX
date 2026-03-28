import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Dashboard from '@/pages/Dashboard';
import Profile from '@/pages/Profile';
import PhishingAnalyzer from '@/pages/PhishingAnalyzer';
import PhishingSimulation from '@/pages/PhishingSimulation';
import NetworkScanner from '@/pages/NetworkScanner';
import FakeLogin from '@/pages/FakeLogin';
import AdminDashboard from '@/pages/AdminDashboard';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';

function AppRoot() {
  useTokenRefresh();
  
  return (
    <Router>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Navbar />
        
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/analyzer" element={<PhishingAnalyzer />} />
            <Route path="/simulator" element={<PhishingSimulation />} />
            <Route path="/scanner" element={<NetworkScanner />} />
            <Route path="/fake-login" element={<FakeLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />

            {/* Legacy compatibility routes redirecting to Dashboard */}
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/register" element={<Navigate to="/dashboard" replace />} />
            <Route path="/mfa-verify" element={<Navigate to="/dashboard" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default function App() {
  return <AppRoot />;
}
