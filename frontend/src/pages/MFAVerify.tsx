import { useAuthStore } from '@/stores/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { api } from '@/lib/api';
import axios from 'axios';
import { KeyRound, AlertCircle } from 'lucide-react';

export default function MFAVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get pending token from Login pass-through state
  const token = location.state?.token;
  
  if (!token) {
    navigate('/login');
    return null;
  }
  
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setErrorMsg('Code must be exactly 6 digits');
      return;
    }
    
    setIsSubmitting(true);
    try {
      setErrorMsg('');
      const response = await api.post('/auth/mfa/verify', { token, code });
      setAuth(response.data.access_token);
      navigate('/dashboard');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setErrorMsg(error.response?.data?.detail || 'Invalid MFA code');
      } else {
        setErrorMsg('MFA verification system error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-6 mt-16">
      <div className="w-full max-w-sm glass-card p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <KeyRound className="w-12 h-12 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Two-Factor Auth</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-2">Enter the 6-digit code from your authenticator app</p>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 text-center">TOTP Code</label>
            <input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              className="input-field text-center text-3xl font-mono tracking-[0.5em] py-4"
              autoFocus
            />
          </div>
          
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-md text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting || code.length !== 6}
            className="w-full btn-primary py-2.5 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50"
          >
            {isSubmitting ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>
      </div>
    </div>
  );
}
