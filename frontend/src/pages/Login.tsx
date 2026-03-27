import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';
import { Shield, AlertCircle } from 'lucide-react';
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
  
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Step 1: Firebase Google popup → get credential
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Step 2: Send Firebase ID token to backend (plain axios, no auth interceptor)
      const response = await axios.post('/api/v1/auth/google', 
        { id_token: idToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      // Step 3: Decode CyberX JWT and store
      const decoded = jwtDecode<DecodedToken>(response.data.access_token);
      setAuth(response.data.access_token, {
        id: decoded.sub,
        email: result.user.email || '',
        roles: decoded.roles || [],
      });
      navigate('/dashboard');
    } catch (error: unknown) {
      console.error('Google Sign-In Error:', error);
      if (axios.isAxiosError(error)) {
        setErrorMsg(error.response?.data?.detail || 'Backend authentication failed. Please try again.');
      } else if (error instanceof Error) {
        // Firebase popup errors
        if (error.message.includes('popup-closed')) {
          setErrorMsg('Sign-in popup was closed. Please try again.');
        } else if (error.message.includes('network')) {
          setErrorMsg('Network error. Please check your connection.');
        } else {
          setErrorMsg('Google sign-in failed. Make sure Google is enabled in Firebase Console.');
        }
      } else {
        setErrorMsg('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-6 mt-16">
      <div className="w-full max-w-md glass-card p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="w-12 h-12 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome to CyberX</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-2">Sign in with your Google account to continue</p>
        </div>
        
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-md text-sm flex items-start gap-2 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-lg border border-slate-700 bg-white hover:bg-slate-100 transition-all text-sm font-semibold disabled:opacity-50 text-slate-800"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <p className="text-center mt-6 text-xs text-[var(--text-secondary)] leading-relaxed">
          By signing in, you agree to CyberX's Zero-Trust security policies.<br />
          Your session will be secured with RS256 JWT tokens.
        </p>
      </div>
    </div>
  );
}
