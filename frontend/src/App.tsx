import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import PrivateRoute from '@/components/common/PrivateRoute';
import AdminRoute from '@/components/common/AdminRoute';

import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import MFAVerify from '@/pages/MFAVerify';
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
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login />} />
            <Route path="/mfa-verify" element={<MFAVerify />} />
            
            {/* Protected Routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/analyzer" element={<PhishingAnalyzer />} />
              <Route path="/simulator" element={<PhishingSimulation />} />
              <Route path="/scanner" element={<NetworkScanner />} />
              <Route path="/fake-login" element={<FakeLogin />} />
              
              {/* Admin Only Routes */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>
            </Route>

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
