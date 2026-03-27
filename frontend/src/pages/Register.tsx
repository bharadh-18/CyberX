import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-6 mt-16">
      <div className="w-full max-w-md glass-card p-8 text-center">
        <div className="flex justify-center mb-4">
          <ShieldCheck className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Get Started with CyberX</h2>
        <p className="text-[var(--text-secondary)] text-sm mt-2 mb-8">
          No registration needed — sign in directly with your Google account.
          Your profile will be created automatically on first login.
        </p>
        
        <button
          onClick={() => navigate('/login')}
          className="w-full btn-primary py-3 rounded-lg font-semibold"
        >
          Continue to Sign In &rarr;
        </button>
      </div>
    </div>
  );
}
