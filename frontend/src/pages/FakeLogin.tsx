import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { AlertCircle, Lock } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function FakeLogin() {
  const navigate = useNavigate();
  const [isExposed, setIsExposed] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      // 1. Log the captured credentials (in a real scenario, this would go to a hacker's DB)
      console.warn("⚠️ DECOY PAGE: Credentials intercepted!");
      console.warn("Email:", data.email);
      console.warn("Password length:", data.password.length);

      // 2. Trigger the behavioral attack simulation in the backend
      await api.post('/security/simulate', {
        clicks_count: 15,       // Extreme clicks to trigger > 0.8 Threshold
        unknown_domain: true,   // High Risk: Phishing domain
        unusual_time: true,
        ip_change: true         // High Risk: Anomalous session location
      });

      // 3. Show the "You've been phished" educational warning
      setIsExposed(true);
      
    } catch (err) {
      console.error(err);
      setIsExposed(true); // Show warning anyway for the demo
    } finally {
      setLoading(false);
    }
  };

  if (isExposed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6">
        <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="inline-flex p-6 rounded-full bg-red-500/10 border-2 border-red-500/20 mb-4 shadow-[0_0_100px_rgba(239,68,68,0.2)]">
            <AlertCircle className="w-20 h-20 text-red-500" />
          </div>
          <h1 className="text-4xl font-black text-red-500 uppercase tracking-tight">You've Been Phished!</h1>
          
          <div className="glass-card p-8 border-red-500/30 text-left space-y-4">
            <h3 className="text-xl font-bold text-white mb-2">What just happened?</h3>
            <p className="text-slate-300">You entered your credentials into a <strong>simulated decoy page</strong>. If this were a real attack, your account would now be compromised.</p>
            
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-sm text-amber-400 space-y-2">
              <div>&gt; Credential harvesting event logged</div>
              <div>&gt; Behavioral telemetry sent to Security Command Center</div>
              <div>&gt; Risk Score evaluated as <strong>CRITICAL</strong></div>
              <div className="text-emerald-400 blink">&gt; Auto-Scan triggered on attacker's IP network...</div>
            </div>
            
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full mt-6 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              Return to Safe Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]">
      {/* 
        Intentionally generic, slightly outdated "Enterprise Dashboard" look 
        to mimic a typical credential harvesting page. 
        Notice it lacks the dark theme and neon features of the real app.
      */}
      <div className="bg-white p-10 rounded-lg shadow-xl w-full max-w-md border-t-4 border-blue-600">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 text-white">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Secure Employee Login</h2>
          <p className="text-sm text-gray-500 mt-1">Please verify your identity to continue</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
            <input
              {...register('email')}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              placeholder="user@company.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              {...register('password')}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              placeholder="••••••••••••"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          <p>© 2026 Enterprise Security Portal. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="#" className="hover:text-blue-600">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
}
