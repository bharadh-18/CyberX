import { useAuthStore } from '@/stores/authStore';
import { ShieldCheck, Lock, Activity, LogIn, Zap, Network } from 'lucide-react';
import PremiumButton from '@/components/ui/PremiumButton';

export default function Landing() {
  const { accessToken } = useAuthStore();

  return (
    <div className="relative min-h-screen pt-24 pb-20 px-4 overflow-hidden flex flex-col items-center justify-center">
      {/* Sleek Enterprise Grid Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none" />

      <div className="text-center max-w-4xl relative z-10 w-full">
        <div 
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-500/80 font-bold text-[10px] mb-8 tracking-[0.2em] uppercase"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Enterprise Zero-Trust Standard
        </div>

        <h1 
          className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.95] text-white"
        >
          <span className="text-shimmer-gold">CYBERX</span>
        </h1>

        <p 
          className="text-lg text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Integrated with a Python FastAPI backend enforcing TLS 1.3, Rate Limiting, RS256 JWT, multi-factor auth, and AI-powered phishing detection heuristics.
        </p>

        <div 
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {!accessToken ? (
            <PremiumButton to="/login" label="Secure Login" icon={LogIn} />
          ) : (
            <PremiumButton to="/dashboard" label="Command Center" icon={Lock} />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 text-left">
          <div 
            className="glass-card p-8 group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
            <div className="w-12 h-12 mb-6 flex items-center justify-center bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Activity className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Live Telemetry</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Real-time observation of network traffic and behavioral anomalies via zero-trust nodes.</p>
          </div>
          
          <div 
            className="glass-card p-8 group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
            <div className="w-12 h-12 mb-6 flex items-center justify-center bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">AI Analysis</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Proprietary weighted heuristic models detecting credential harvesting and BEC attempts instantly.</p>
          </div>
          
          <div 
            className="glass-card p-8 group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
            <div className="w-12 h-12 mb-6 flex items-center justify-center bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Network className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">WAF Protected</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Multi-tier rate limiting and automatic IP blocking to secure the enterprise perimeter.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
