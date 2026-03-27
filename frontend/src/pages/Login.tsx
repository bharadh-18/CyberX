import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Shield, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email format').transform(val => val.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  
  const [errorMsg, setErrorMsg] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaPassed, setCaptchaPassed] = useState(false);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });
  
  const onSubmit = async (data: LoginFormData) => {
    if (showCaptcha && !captchaPassed) {
      setErrorMsg('Please complete the CAPTCHA first');
      return;
    }

    try {
      setErrorMsg('');
      
      // Feature A1.2: Progressive delays to mitigate brute forcing on the client alongside the rate limiter
      if (failedAttempts > 0) {
        const delayMs = failedAttempts * 500; 
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });
      
      // Success: Reset metrics
      setFailedAttempts(0);
      setShowCaptcha(false);

      if (response.data.mfa_required) {
        navigate('/mfa-verify', { state: { token: response.data.token } });
      } else {
        setAuth(response.data.access_token);
        navigate('/dashboard');
      }
      
    } catch (error: any) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= 3) {
        setShowCaptcha(true);
        setCaptchaPassed(false);
      }

      if (error.response?.status === 429) {
        setErrorMsg('Too many login attempts. Please try again later.');
      } else if (error.response?.status === 401) {
        setErrorMsg('Invalid email or password');
      } else if (error.response?.status === 403) {
        setErrorMsg(error.response.data.detail || 'Account locked');
      } else {
        setErrorMsg('Login failed. Please try again.');
      }
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-6 mt-16">
      <div className="w-full max-w-md glass-card p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="w-12 h-12 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-2">Sign in to your secure account</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              {...register('email')}
              className="input-field"
            />
            {errors.email && <p className="text-sm text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.email.message}</p>}
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              placeholder="••••••••••••"
              {...register('password')}
              className="input-field"
            />
            {errors.password && <p className="text-sm text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.password.message}</p>}
          </div>
          
          {showCaptcha && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-md space-y-3">
              <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider">Security Check</label>
              <div className="flex items-center justify-between bg-black/40 p-3 rounded">
                <span className="text-sm">I am securely resolving this login</span>
                <input 
                  type="checkbox" 
                  checked={captchaPassed}
                  onChange={(e) => setCaptchaPassed(e.target.checked)}
                  className="w-5 h-5 accent-indigo-500"
                />
              </div>
            </div>
          )}
          
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-md text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary py-2.5 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
        
        <div className="text-center mt-6 text-sm text-[var(--text-secondary)]">
          Don't have an account? <Link to="/register" className="text-indigo-400 hover:underline">Register here</Link>
        </div>
      </div>
    </div>
  );
}
