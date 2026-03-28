import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Shield, AlertCircle, LogIn, UserPlus, Timer } from 'lucide-react';
import PremiumButton from '@/components/ui/PremiumButton';
import { useAuthStore } from '@/stores/authStore';
import { jwtDecode } from 'jwt-decode';
import { firebaseAuth } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';

interface DecodedToken {
  sub: string;
  roles: string[];
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 60;

export default function Login() {
  const navigate = useNavigate();
  const { setAuth, setProfileCreated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState('vedhan@gmail.com');
  const [password, setPassword] = useState('123456');

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


  const handleSubmit = async () => {
    if (isLockedOut) return;

    if (!email || !password) {
      setErrorMsg('Email and Password are required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      let userCredential;
      
      if (isLogin) {
        // 1. Authenticate with Firebase
        userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      } else {
        // 1. Register with Firebase
        userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      }

      // 2. Get ID Token
      const idToken = await userCredential.user.getIdToken();

      // 3. Sync with Neon DB via Reliability Bridge (Bearer Token)
      try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/sync-profile`, {}, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });

        setProfileCreated(true);
        const decoded = jwtDecode<DecodedToken>(response.data.access_token);
        setAuth(response.data.access_token, {
          id: decoded.sub,
          email: email,
          roles: decoded.roles || [],
        });

        setFailedAttempts(0);
        // CRITICAL FIX: Only navigate if backend returns 200 OK
        navigate('/dashboard');
      } catch (syncError: any) {
        console.error("Reliability Sync Error:", syncError);
        
        const errorDetail = syncError.response?.data?.detail || syncError.message;
        
        if (syncError.response?.status === 503) {
          setErrorMsg(`Database Sync Failed: User vault synchronization failed.`);
        } else {
          setErrorMsg(`Database Sync Failed: ${errorDetail}`);
        }
        
        setLoading(false);
        return;
      }

    } catch (error: any) {
      console.error("Auth process error:", error);
      let detail = 'Authentication failed. Please check your credentials.';
      
      // Handle 'Failed to fetch' or Network Issues
      if (error.message === 'Failed to fetch' || error.message === 'Network Error') {
        detail = 'SECURE GATEWAY ERROR: NETWORK ERROR. Verifying bridge connectivity...';
        // Auto-trigger connectivity test
        axios.get(`${import.meta.env.VITE_API_URL}/health`).catch(() => {
          console.warn("Backend Health Check Failed during Auth Error.");
        });
      }

      // 1. Handle Firebase Specific Errors
      if (error.code) {
        switch (error.code) {
          case 'auth/wrong-password':
          case 'auth/user-not-found':
            detail = 'Invalid email or password.';
            break;
          case 'auth/email-already-in-use':
            detail = 'This email is already registered in our secure vault.';
            break;
          case 'auth/weak-password':
            detail = 'Password is too weak. Minimum 6 characters required.';
            break;
          case 'auth/invalid-email':
            detail = 'The email address is improperly formatted.';
            break;
          case 'auth/operation-not-allowed':
            detail = 'Email/Password authentication is disabled. Contact admin.';
            break;
          default:
            detail = `Firebase Auth Error: ${error.message}`;
        }
      } 

      if (isLogin) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          const lockUntil = Date.now() + LOCKOUT_SECONDS * 1000;
          setLockoutUntil(lockUntil);
          setLockoutRemaining(LOCKOUT_SECONDS);
          setErrorMsg(`Brute-force lockout engaged. Authentication disabled for ${LOCKOUT_SECONDS}s.`);
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
