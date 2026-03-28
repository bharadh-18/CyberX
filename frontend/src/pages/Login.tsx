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
  const [isFlipped, setIsFlipped] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

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

  const logBruteForceAttempt = async (email: string) => {
    try {
      await addDoc(collection(firestoreDb, 'audit_logs'), {
        event: 'BRUTE_FORCE_ATTEMPT',
        severity: 'HIGH',
        email: email,
        timestamp: new Date(),
        details: `Account locked for ${LOCKOUT_SECONDS}s after ${MAX_ATTEMPTS} failed attempts`
      });
    } catch (e) {
      console.warn('Audit log write failed:', e);
    }
  };

  const handleEmailAuth = async (isRegister: boolean) => {
    if (isLockedOut) return;

    setLoading(true);
    setErrorMsg('');
    try {
      if (isRegister) {
        if (!registerEmail || !registerPassword) {
          setErrorMsg('Work Email and Token required.');
          setLoading(false); return;
        }
        await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, {
          email: registerEmail,
          password: registerPassword
        });
        setIsFlipped(false);
        setErrorMsg('Provisioning successful. Please authenticate.');
        setRegisterPassword('');
      } else {
        if (!loginEmail || !loginPassword) {
          setErrorMsg('Organization Email and Security Token required.');
          setLoading(false); return;
        }
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, {
          email: loginEmail,
          password: loginPassword,
        });

        if (response.data.mfa_required) {
          navigate('/mfa-verify', { state: { token: response.data.token } });
          return;
        }

        const decoded = jwtDecode<DecodedToken>(response.data.access_token);
        setAuth(response.data.access_token, {
          id: decoded.sub,
          email: loginEmail,
          roles: decoded.roles || [],
        });

        setFailedAttempts(0);
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.detail || 'Authentication failed. Invalid credentials.';
      
      if (!isRegister) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          const lockUntil = Date.now() + LOCKOUT_SECONDS * 1000;
          setLockoutUntil(lockUntil);
          setLockoutRemaining(LOCKOUT_SECONDS);
          setErrorMsg(`Brute-force lockout engaged. Authentication disabled for ${LOCKOUT_SECONDS}s.`);
          logBruteForceAttempt(loginEmail);
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
    <div className="auth-wrapper relative overflow-hidden bg-black">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="card-switch">
        <label className="switch">
          <input 
            type="checkbox" 
            className="toggle" 
            checked={isFlipped}
            onChange={() => setIsFlipped(!isFlipped)}
          />
          <span className="slider"></span>
          <span className="card-side"></span>
          
          <div className="flip-card__inner">
            {/* FRONT: LOG IN */}
            <div className="flip-card__front">
              <div className="flex justify-center mb-0">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                  <Shield className="w-8 h-8 text-amber-500" />
                </div>
              </div>
              <h2 className="flip-card__title">Sign In</h2>
              
              <div className="flip-card__form">
                <input 
                  className="flip-card__input" 
                  placeholder="Organization Email" 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={isLockedOut}
                />
                <input 
                  className="flip-card__input" 
                  placeholder="Security Token" 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={isLockedOut}
                />
                
                <div className="pt-2 border-t border-white/5 w-full">
                  {isLockedOut ? (
                    <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest">
                      <Timer className="w-4 h-4 animate-pulse" />
                      Locked — {lockoutRemaining}s remaining
                    </div>
                  ) : (
                    <PremiumButton 
                      onClick={() => handleEmailAuth(false)}
                      disabled={loading}
                      label={loading ? 'Verifying...' : 'Authenticate'}
                      icon={LogIn}
                      className="w-full justify-center"
                    />
                  )}
                </div>
              </div>

              {errorMsg && !isFlipped && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" /> <span className="leading-tight">{errorMsg}</span>
                </div>
              )}

              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mt-2 opacity-60">
                Authorized access only. All sessions are monitored under Zero-Trust protocol.
              </p>
            </div>

            {/* BACK: SIGN UP */}
            <div className="flip-card__back">
              <div className="flex justify-center mb-2">
                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                  <UserPlus className="w-8 h-8 text-amber-500" />
                </div>
              </div>
              <h2 className="flip-card__title">Sign Up</h2>
              
              <div className="flip-card__form">
                <input 
                  className="flip-card__input" 
                  placeholder="Work Email" 
                  type="email" 
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
                <input 
                  className="flip-card__input" 
                  placeholder="Token Signature" 
                  type="password" 
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                />
                
                <div className="pt-4 border-t border-white/5 w-full">
                  <PremiumButton 
                    onClick={() => handleEmailAuth(true)}
                    disabled={loading}
                    label={loading ? 'Provisioning...' : 'Provision Account'}
                    icon={UserPlus}
                    className="w-full justify-center"
                  />
                </div>
              </div>

              {errorMsg && isFlipped && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {errorMsg}
                </div>
              )}

              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mt-2 opacity-60">
                Enrollment requires active corporate identity verification.
              </p>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
