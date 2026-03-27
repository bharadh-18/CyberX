import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ShieldCheck, Lock, Activity, Bot } from 'lucide-react';

export default function Landing() {
  const { accessToken } = useAuthStore();

  return (
    <div className="relative min-h-[calc(100vh-64px)] mt-16 overflow-hidden flex flex-col items-center justify-center py-20 px-4">
      {/* Sleek Enterprise Grid Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 mix-blend-screen pointer-events-none -z-10" />

      <div className="text-center max-w-4xl relative z-10 w-full">
        <div 
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] font-medium text-xs mb-8 tracking-wider uppercase animate-fade-up"
          style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Enterprise Zero-Trust Standard
        </div>

        <h1 
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05] animate-fade-up text-white"
          style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}
        >
          Security-First <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-300 to-slate-500">
            AI Cyber Defense
          </span>
        </h1>

        <p 
          className="text-lg text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-up"
          style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}
        >
          Integrated with a Python FastAPI backend enforcing TLS 1.3, Rate Limiting, RS256 JWT, multi-factor auth, and AI-powered phishing detection heuristics.
        </p>

        <div 
          className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up"
          style={{ animationDelay: '0.4s', opacity: 0, animationFillMode: 'forwards' }}
        >
          {!accessToken ? (
              <Link to="/login" className="w-full sm:w-auto btn-primary">
                Sign in with Google &rarr;
              </Link>
          ) : (
            <Link to="/dashboard" className="w-full sm:w-auto btn-primary">
              Enter Command Center
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left">
          <div 
            className="glass-card p-6 animate-fade-up group relative overflow-hidden"
            style={{ animationDelay: '0.5s', opacity: 0, animationFillMode: 'forwards' }}
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
            <div className="w-10 h-10 mb-5 flex items-center">
              <Lock className="w-6 h-6 text-indigo-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-white tracking-tight">Defense in Depth</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">7 distinct layers validating rate limits, structure, headers, auth, and logic on every single API request.</p>
          </div>
          
          <div 
            className="glass-card p-6 animate-fade-up group relative overflow-hidden"
            style={{ animationDelay: '0.6s', opacity: 0, animationFillMode: 'forwards' }}
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
            <div className="w-10 h-10 mb-5 flex items-center">
              <Bot className="w-6 h-6 text-purple-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-white tracking-tight">AI Threat Sandbox</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">Real-time ML analysis pipeline parsing text for credential harvesting and social engineering vectors.</p>
          </div>
          
          <div 
            className="glass-card p-6 animate-fade-up group relative overflow-hidden"
            style={{ animationDelay: '0.7s', opacity: 0, animationFillMode: 'forwards' }}
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-50" />
            <div className="w-10 h-10 mb-5 flex items-center">
              <Activity className="w-6 h-6 text-sky-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-white tracking-tight">Envelope Encryption</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">PII uniquely mapped through AES-256-GCM data encryption keys wrapped securely via Master KEKs.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
