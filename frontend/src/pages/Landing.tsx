import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ShieldCheck, Lock, Activity, Bot } from 'lucide-react';

export default function Landing() {
  const { accessToken } = useAuthStore();

  return (
    <div className="relative min-h-[calc(100vh-64px)] mt-16 overflow-hidden flex flex-col items-center justify-center py-20">
      {/* Background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[100px] -z-10 pointer-events-none mix-blend-screen" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[80px] -z-10 pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] -z-10 pointer-events-none mix-blend-screen" />

      <div className="text-center max-w-4xl px-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 font-semibold text-sm mb-8">
          <ShieldCheck className="w-4 h-4" />
          Zero-Trust Architecture Standard
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          Security-First <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-sky-400">
            Frontend Architecture
          </span>
        </h1>

        <p className="text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto leading-relaxed">
          Integrated with a Python FastAPI backend enforcing TLS 1.3, Rate Limiting, RS256 JWT, multi-factor auth, and AI-powered phishing detection heuristics.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {!accessToken ? (
            <>
              <Link to="/register" className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-[0_0_30px_rgba(79,70,229,0.3)] transition-all hover:scale-105">
                Start Secure Session
              </Link>
              <Link to="/login" className="w-full sm:w-auto px-8 py-3.5 bg-black/40 hover:bg-black/60 border border-white/10 text-white font-bold rounded-lg backdrop-blur-sm transition-all">
                Login with MFA
              </Link>
            </>
          ) : (
            <Link to="/dashboard" className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all hover:scale-105">
              Enter Dashboard
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          <div className="glass-card p-6 border-t-2 border-indigo-500/50 hover:bg-white/5 transition-colors">
            <Lock className="w-8 h-8 text-indigo-400 mb-4" />
            <h3 className="font-bold text-lg mb-2">Defense in Depth</h3>
            <p className="text-[var(--text-secondary)] text-sm">7 distinct backend layers validating rate limits, structure, headers, auth, and logic on every single request.</p>
          </div>
          <div className="glass-card p-6 border-t-2 border-purple-500/50 hover:bg-white/5 transition-colors">
            <Bot className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="font-bold text-lg mb-2">AI Phishing Sandbox</h3>
            <p className="text-[var(--text-secondary)] text-sm">Real-time analysis pipeline parsing unstructured text for credential harvesting, URL reputation, and social engineering.</p>
          </div>
          <div className="glass-card p-6 border-t-2 border-sky-500/50 hover:bg-white/5 transition-colors">
            <Activity className="w-8 h-8 text-sky-400 mb-4" />
            <h3 className="font-bold text-lg mb-2">Envelope Encryption</h3>
            <p className="text-[var(--text-secondary)] text-sm">PII and authentication secrets mapped securely through AES-256-GCM data encryption keys wrapped via Master keys.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
