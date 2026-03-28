import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';
import { Shield, AlertCircle, LogIn, UserPlus, Bot } from 'lucide-react';
import PremiumButton from '@/components/ui/PremiumButton';
import { useAuthStore } from '@/stores/authStore';
import { jwtDecode } from 'jwt-decode';
import { signInWithPopup } from 'firebase/auth';
import { firebaseAuth, googleProvider } from '@/lib/firebase';

interface DecodedToken {
  sub: string;
  roles: string[];
}

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isFlipped, setIsFlipped] = useState(false); // Track LogIn vs SignUP

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const idToken = await result.user.getIdToken();

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/google`, 
        { id_token: idToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.mfa_required) {
        navigate('/mfa-verify', { state: { token: response.data.token } });
        return;
      }

      const decoded = jwtDecode<DecodedToken>(response.data.access_token);
      setAuth(response.data.access_token, {
        id: decoded.sub,
        email: result.user.email || '',
        displayName: result.user.displayName || '',
        roles: decoded.roles || [],
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.response?.data?.detail || 'Google Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (isRegister: boolean) => {
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
        setIsFlipped(false); // Flip back to login
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

        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.response?.data?.detail || 'Authentication failed. Please try again.');
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
                />
                <input 
                  className="flip-card__input" 
                  placeholder="Security Token" 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                
                <div className="pt-2 border-t border-white/5 w-full space-y-3">
                  <PremiumButton 
                    onClick={() => handleEmailAuth(false)}
                    disabled={loading}
                    label={loading ? 'Verifying...' : 'Authenticate'}
                    icon={LogIn}
                    className="w-full justify-center"
                  />

                  {/* Google SSO Button matching Enterprise Gold Theme */}
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink-0 mx-2 text-white/30 text-[9px] tracking-[0.2em] font-bold">OR</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  <PremiumButton 
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    label="Continue with Google"
                    icon={Bot}
                    className="w-full justify-center !bg-slate-800 hover:!bg-slate-700 !border-slate-600 !text-white"
                  />
                </div>

              </div>

              {errorMsg && !isFlipped && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" /> <span className="leading-tight">{errorMsg}</span>
                </div>
              )}
              
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
