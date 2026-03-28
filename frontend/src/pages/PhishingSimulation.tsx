import { useState } from 'react';
import { api } from '@/lib/api';
import { AlertTriangle, Zap, MousePointer2, Globe, Clock, Network, ShieldCheck } from 'lucide-react';
import PremiumButton from '@/components/ui/PremiumButton';

interface SimulationResult {
  risk_score: number;
  status: 'LOW' | 'MEDIUM' | 'HIGH';
  anomalies: string[];
}

export default function PhishingSimulation() {
  const [clicks, setClicks] = useState(0);
  const [unknownDomain, setUnknownDomain] = useState(false);
  const [unusualTime, setUnusualTime] = useState(false);
  const [ipChange, setIpChange] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const triggerSimulation = async () => {
    setLoading(true);
    try {
      const response = await api.post('/security/simulate', {
        clicks_count: clicks,
        unknown_domain: unknownDomain,
        unusual_time: unusualTime,
        ip_change: ipChange,
      });
      setResult(response.data);
    } catch (error) {
      console.error('Simulation failed', error);
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (type: 'benign' | 'suspicious' | 'attack') => {
    if (type === 'benign') {
      setClicks(1);
      setUnknownDomain(false);
      setUnusualTime(false);
      setIpChange(false);
    } else if (type === 'suspicious') {
      setClicks(6);
      setUnknownDomain(true);
      setUnusualTime(false);
      setIpChange(false);
    } else {
      setClicks(15);
      setUnknownDomain(true);
      setUnusualTime(true);
      setIpChange(true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 mt-16 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Zap className="w-8 h-8 text-indigo-500" />
          Phishing Simulation Module
        </h1>
        <p className="text-[var(--text-secondary)]">Test our AI behavioral engine by simulating anomalous link click patterns</p>
      </div>

      {/* Decoy Launch Banner */}
      <div className="glass-card p-6 border-l-4 border-l-indigo-500 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            Interactive Decoy Page
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Launch a simulated phishing page to demonstrate credential harvesting and automatic behavioral anomaly detection.
          </p>
        </div>
        <PremiumButton 
          to="/fake-login"
          label="Launch Decoy Page"
          icon={Globe}
          className="whitespace-nowrap"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls Card */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Simulation Parameters</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setPreset('benign')}
                className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
              >
                Benign
              </button>
              <button 
                onClick={() => setPreset('suspicious')}
                className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
              >
                Suspicious
              </button>
              <button 
                onClick={() => setPreset('attack')}
                className="px-3 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                Attack
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <MousePointer2 className="w-4 h-4 text-indigo-400" />
                Link Clicks (Rapid Succession)
              </label>
              <input 
                type="range" 
                min="0" 
                max="25" 
                value={clicks}
                onChange={(e) => setClicks(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>0 Clicks</span>
                <span className="text-indigo-400 font-bold">{clicks}</span>
                <span>25 Clicks</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <label className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${unknownDomain ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${unknownDomain ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Unknown Domain Access</div>
                    <div className="text-xs text-slate-500">Accessing non-whitelisted/new domains</div>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={unknownDomain} 
                  onChange={(e) => setUnknownDomain(e.target.checked)}
                  className="w-5 h-5 rounded border-white/10 bg-black/20 text-indigo-500 focus:ring-0 focus:ring-offset-0"
                />
              </label>

              <label className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${unusualTime ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${unusualTime ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Unusual Login Time</div>
                    <div className="text-xs text-slate-500">Simulate activity during 2 AM - 4 AM</div>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={unusualTime} 
                  onChange={(e) => setUnusualTime(e.target.checked)}
                  className="w-5 h-5 rounded border-white/10 bg-black/20 text-indigo-500 focus:ring-0 focus:ring-offset-0"
                />
              </label>

              <label className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${ipChange ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${ipChange ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Network className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Rapid IP Change</div>
                    <div className="text-xs text-slate-500">Simulate a session hijack / IP shift</div>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={ipChange} 
                  onChange={(e) => setIpChange(e.target.checked)}
                  className="w-5 h-5 rounded border-white/10 bg-black/20 text-indigo-500 focus:ring-0 focus:ring-offset-0"
                />
              </label>
            </div>
          </div>

          <PremiumButton 
            onClick={triggerSimulation}
            disabled={loading}
            label={loading ? 'Simulating...' : 'Trigger Simulation'}
            icon={Zap}
            className="w-full justify-center py-6 mt-6 shadow-[0_0_20px_rgba(212,175,55,0.1)]"
          />
        </div>

        {/* Results Card */}
        <div className="glass-card p-6 flex flex-col">
          <h3 className="font-semibold text-lg mb-6">Real-Time Risk Analysis</h3>
          
          {!result ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl p-12 text-center">
              <ShieldCheck className="w-16 h-16 text-slate-800 mb-4" />
              <div className="text-slate-500 font-medium">Ready for Simulation</div>
              <p className="text-slate-600 text-sm mt-1">Select parameters and trigger to see AI results</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col items-center justify-center p-8 bg-black/40 rounded-3xl border border-white/5 relative overflow-hidden">
                {/* Background glow based on status */}
                <div className={`absolute inset-0 opacity-10 blur-3xl rounded-full ${
                  result.status === 'HIGH' ? 'bg-red-500' : 
                  result.status === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                
                <div className={`text-6xl font-black font-mono mb-2 tracking-tighter ${
                  result.status === 'HIGH' ? 'text-red-500' : 
                  result.status === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                  {(result.risk_score * 100).toFixed(0)}%
                </div>
                <div className={`px-4 py-1 text-xs font-black uppercase tracking-[0.2em] rounded-full border ${
                  result.status === 'HIGH' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                  result.status === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                  'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                }`}>
                  {result.status} RISK DETECTED
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Behavioral Anomalies</h4>
                {result.anomalies.length > 0 ? (
                  <div className="space-y-2">
                    {result.anomalies.map((anomaly, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-300">{anomaly}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-sm text-slate-300">No significant anomalies detected</span>
                  </div>
                )}
              </div>

              <div className="mt-auto p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-xs text-indigo-300/80 italic leading-relaxed">
                Note: This simulation has been logged to the System Audit Log. Check the Command Center to see it appear in real-time.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
