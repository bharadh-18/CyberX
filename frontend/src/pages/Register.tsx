import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '@/lib/api';
import axios from 'axios';
import { ShieldCheck, AlertCircle } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Invalid email format').transform(val => val.toLowerCase()),
  password: z.string().min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  });
  
  // Directly watch the password for the strength meter
  // eslint-disable-next-line react-hooks/incompatible-library
  const pwdValue = watch('password', '');
  
  const onSubmit = async (data: RegisterFormData) => {
    try {
      setErrorMsg('');
      await api.post('/auth/register', {
        email: data.email,
        password: data.password,
      });
      navigate('/login');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setErrorMsg(error.response?.data?.detail || 'Registration failed');
      } else {
        setErrorMsg('An unexpected security error occurred');
      }
    }
  };

  const getStrengthClass = () => {
    if (!pwdValue) return 'w-0';
    if (pwdValue.length >= 12 && /[A-Z]/.test(pwdValue) && /[0-9]/.test(pwdValue) && /[^a-zA-Z0-9]/.test(pwdValue)) {
      return 'w-full bg-[var(--success)]';
    }
    if (pwdValue.length >= 8) return 'w-2/3 bg-[var(--warning)]';
    return 'w-1/3 bg-[var(--danger)]';
  };
  
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-6 mt-16">
      <div className="w-full max-w-md glass-card p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <ShieldCheck className="w-12 h-12 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Create Account</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-2">Join the Zero-Trust Platform</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Email Address</label>
            <input type="email" placeholder="you@example.com" {...register('email')} className="input-field" />
            {errors.email && <p className="text-sm text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.email.message}</p>}
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Password</label>
            <input type="password" placeholder="Min 12 characters" {...register('password')} className="input-field" />
            
            <div className="h-1.5 w-full bg-white/5 rounded-full mt-2 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${getStrengthClass()}`} />
            </div>
            
            {errors.password && <p className="text-sm text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.password.message}</p>}
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Confirm Password</label>
            <input type="password" placeholder="Re-enter your password" {...register('confirmPassword')} className="input-field" />
            {errors.confirmPassword && <p className="text-sm text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.confirmPassword.message}</p>}
          </div>
          
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-md text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          
          <button type="submit" disabled={isSubmitting} className="w-full btn-primary py-2.5 mt-2 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50">
            {isSubmitting ? 'Creating Secure Account...' : 'Register'}
          </button>
        </form>
        
        <div className="text-center mt-6 text-sm text-[var(--text-secondary)]">
          Already have an account? <Link to="/login" className="text-indigo-400 hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
