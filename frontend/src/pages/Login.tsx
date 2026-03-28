import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Shield, AlertCircle, LogIn, UserPlus, Timer } from 'lucide-react';
import PremiumButton from '@/components/ui/PremiumButton';
import { useAuthStore } from '@/stores/authStore';
import { jwtDecode } from 'jwt-decode';
import { firestoreDb } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface DecodedToken {
  sub: string;
  roles: string[];
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 60;

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState('vedhan@gmail.com');
  const [password, setPassword] = useState('12345');

  // Rate Limiting State
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;

  useEffect(() => {
    if (lockoutUntil) {
      lockoutTimerRef.current = setInterval(() => {
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockoutUntil(null);
          setLockoutRemaining(0);
          setFailedAttempts(0);
          setErrorMsg('');
          if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
        } else {
          setLockoutRemaining(remaining);
        }
      }, 1000);
    }
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    };
  }, [lockoutUntil]);

  const logBruteForceAttempt = async (targetEmail: string) => {
    try {
      await addDoc(collection(firestoreDb, 'audit_logs'), {
        event: 'BRUTE_FORCE_ATTEMPT',
        severity: 'HIGH',
        email: targetEmail,
        timestamp: new Date(),
        details: `Account locked for ${LOCKOUT_SECONDS}s after ${MAX_ATTEMPTS} failed attempts`
      });
    } catch (e) {
      console.warn('Audit log write failed:', e);
    }
  };

  const handleSubmit = async () => {
    if (isLockedOut) return;

    if (!email || !password) {
      setErrorMsg('Email and Password are required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      if (isLogin) {
        // --- SIGN IN ---
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, {
          email,
          password,
        });

        if (response.data.mfa_required) {
          navigate('/mfa-verify', { state: { token: response.data.token } });
          return;
        }

        const decoded = jwtDecode<DecodedToken>(response.data.access_token);
        setAuth(response.data.access_token, {
          id: decoded.sub,
          email: email,
          roles: decoded.roles || [],
        });

        setFailedAttempts(0);
        navigate('/dashboard');
      } else {
        // --- SIGN UP ---
        await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, {
          email,
          password,
        });
        setIsLogin(true);
        setPassword('');
        setErrorMsg('Account provisioned successfully. Please authenticate.');
      }
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.detail || 'Authentication failed. Invalid credentials.';

      if (isLogin) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          const lockUntil = Date.now() + LOCKOUT_SECONDS * 1000;
          setLockoutUntil(lockUntil);
          setLockoutRemaining(LOCKOUT_SECONDS);
          setErrorMsg(`Brute-force lockout engaged. Authentication disabled for ${LOCKOUT_SECONDS}s.`);
          logBruteForceAttempt(email);
          setLoading(false);
          return;
        }
        setErrorMsg(`${detail} (Attempt ${newAttempts}/${MAX_ATTEMPTS})`);
      } else {
        setErrorMsg(detail);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-24 pb-12 px-4 relative overflow-hidden bg-black">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        {/* The Card */}
        <div className="bg-[rgba(10,10,10,0.9)] backdrop-blur-xl border border-[rgba(212,175,55,0.2)] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-10">
          
          {/* Header */}
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-2xl border ${isLogin ? 'bg-white/5 border-white/10' : 'bg-amber-500/10 border-amber-500/20 shadow-[0_0_30px_rgba(212,175,55,0.1)]'}`}>
              {isLogin ? (
                <Shield className="w-8 h-8 text-amber-500" />
              ) : (
                <UserPlus className="w-8 h-8 text-amber-500" />
              )}
            </div>
          </div>
          <h2 className="text-center text-3xl font-black uppercase tracking-tight text-white mb-6">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </h2>

          {/* Error / Success Block */}
          {errorMsg && (
            <div className={`mb-5 p-3 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
              errorMsg.includes('successfully') || errorMsg.includes('Provisioning successful')
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-500'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="leading-tight">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <input
              className="flip-card__input"
              placeholder="Organization Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLockedOut}
            />
            <input
              className="flip-card__input"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLockedOut}
            />

            <div className="pt-4 border-t border-white/5">
              {isLockedOut ? (
                <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest">
                  <Timer className="w-4 h-4 animate-pulse" />
                  Locked — {lockoutRemaining}s remaining
                </div>
              ) : (
                <PremiumButton
                  onClick={handleSubmit}
                  disabled={loading}
                  label={loading ? 'Processing...' : (isLogin ? 'Authenticate' : 'Provision Account')}
                  icon={isLogin ? LogIn : UserPlus}
                  className="w-full justify-center"
                />
              )}
            </div>
          </div>

          {/* Toggle Link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg('');
                setPassword('');
              }}
              type="button"
              className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span className="text-amber-500 underline underline-offset-4">
                {isLogin ? 'Sign Up' : 'Sign In'}
              </span>
            </button>
          </div>

        </div>

        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center mt-6 opacity-60">
          Authorized access only. All sessions are monitored under Zero-Trust protocol.
        </p>
      </div>
    </div>
  );
}
