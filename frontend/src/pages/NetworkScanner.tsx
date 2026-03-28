import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Radar, Search, Shield, AlertTriangle, Server, Wifi, Terminal } from 'lucide-react';
import PremiumButton from '@/components/ui/PremiumButton';

interface ServiceInfo {
  port: number;
  service: string;
  version: string;
}

interface ScanResult {
  ip: string;
  status: string;
  host_status: string;
  scan_method: string;
  open_ports: number[];
  services: ServiceInfo[];
  risk_score: number;
  risk_level: string;
  anomalies: string[];
  high_risk_ports: number[];
  medium_risk_ports: number[];
  safe_ports: number[];
  timestamp: string;
}

const PORT_COLOR = (port: number, result: ScanResult) => {
  if (result.high_risk_ports.includes(port)) return 'bg-red-500/10 text-red-500 border-red-500/20';
  if (result.medium_risk_ports.includes(port)) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
};

const RISK_CONFIG: Record<string, { color: string; bgSoft: string; border: string; rawBg: string }> = {
  CRITICAL: { color: 'text-red-500', bgSoft: 'bg-red-500/10', border: 'border-red-500/20', rawBg: 'bg-red-500' },
  HIGH:     { color: 'text-orange-500', bgSoft: 'bg-orange-500/10', border: 'border-orange-500/20', rawBg: 'bg-orange-500' },
  MEDIUM:   { color: 'text-amber-500', bgSoft: 'bg-amber-500/10', border: 'border-amber-500/20', rawBg: 'bg-amber-500' },
  LOW:      { color: 'text-emerald-500', bgSoft: 'bg-emerald-500/10', border: 'border-emerald-500/20', rawBg: 'bg-emerald-500' },
  CLEAN:    { color: 'text-cyan-500', bgSoft: 'bg-cyan-500/10', border: 'border-cyan-500/20', rawBg: 'bg-cyan-500' },
};

export default function NetworkScanner() {
  const [ip, setIp] = useState('127.0.0.1');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/security/scan-results');
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const runScan = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/security/scan', { ip });
      setResult(res.data);
      setHistory(prev => [res.data, ...prev].slice(0, 10));
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Scan failed. Ensure IP is in a private range.');
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? RISK_CONFIG[result.risk_level] || RISK_CONFIG.LOW : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 mt-16 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-white">
          <Radar className="w-8 h-8 text-amber-500" />
          Network Threat Scanner
        </h1>
        <p className="text-[var(--text-secondary)]">Automated Nmap-powered port scanning with AI risk analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scan Controls */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2 text-white uppercase tracking-widest">
            <Search className="w-5 h-5 text-amber-500" /> Target Configuration
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Target IP Address</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={ip}
                  onChange={e => setIp(e.target.value)}
                  placeholder="e.g. 127.0.0.1"
                  className="flex-1 px-4 py-3 bg-[#000] border border-white/5 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500/30 transition-all placeholder:text-slate-700"
                />
                <PremiumButton 
                  onClick={runScan}
                  disabled={loading || !ip.trim()}
                  label={loading ? 'Scanning...' : 'Run Scan'}
                  icon={Terminal}
                  className="transform scale-90 origin-left"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Only private IP ranges allowed (127.x, 10.x, 172.16-31.x, 192.168.x)</p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2 font-bold uppercase tracking-widest">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-2 flex-wrap pt-4 border-t border-white/5">
            {['127.0.0.1', '192.168.1.1', '10.0.0.1'].map(preset => (
              <button
                key={preset}
                onClick={() => setIp(preset)}
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg bg-white/5 border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-slate-400"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Scan History */}
          {history.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/5">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scan History</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {history.map((h, i) => {
                  const hcfg = RISK_CONFIG[h.risk_level] || RISK_CONFIG.LOW;
                  return (
                    <button
                      key={i}
                      onClick={() => setResult(h)}
                      className="w-full flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5 hover:border-amber-500/20 transition-all text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-slate-500" />
                        <span className="font-mono text-sm text-slate-300">{h.ip}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${hcfg.bgSoft} ${hcfg.color} border ${hcfg.border} uppercase tracking-widest`}>
                          {h.risk_level}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="glass-card p-6 flex flex-col border-l-4 border-amber-500/50 bg-amber-500/5">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-6 text-white uppercase tracking-tighter">
            <Shield className="w-5 h-5 text-amber-500" /> Threat Analysis Data
          </h3>

          {!result ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl p-12 text-center text-slate-500">
              <Wifi className="w-16 h-16 text-slate-800 mb-4" />
              <div className="font-black uppercase tracking-[0.2em]">Node Waiting</div>
              <p className="text-[10px] mt-1 font-bold">Initiate scan to receive telemetry</p>
            </div>
          ) : (
            <div className="space-y-6 flex-1">
              {/* Risk Score Header */}
              <div className="flex flex-col items-center p-8 bg-black/40 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className={`absolute inset-0 opacity-10 blur-3xl rounded-full ${cfg?.rawBg}`} />
                <div className={`text-6xl font-black font-mono tracking-tighter mb-2 ${cfg?.color}`}>
                  {(result.risk_score * 100).toFixed(0)}%
                </div>
                <div className={`px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border ${cfg?.bgSoft} ${cfg?.color} border-current/20`}>
                  SCAN STATUS: {result.risk_level}
                </div>
              </div>

              {/* Open Ports */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  Discovered Ports ({result.open_ports.length})
                </h4>
                {result.open_ports.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.services.map((svc, i) => (
                      <div
                        key={i}
                        className={`px-3 py-1.5 rounded-xl border text-[10px] font-mono font-bold flex items-center gap-2 ${PORT_COLOR(svc.port, result)}`}
                      >
                        <Terminal className="w-3 h-3 opacity-50" />
                        <span>{svc.port}</span>
                        <span className="opacity-40 font-normal">[{svc.service}]</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic uppercase font-bold tracking-widest">Inert Target Node</p>
                )}
              </div>

              {/* Anomalies */}
              {result.anomalies.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Heuristic Anomalies</h4>
                  <div className="space-y-2">
                    {result.anomalies.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-black/30 p-3 rounded-xl border border-white/5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-[10px] font-bold text-amber-500/60 uppercase tracking-widest">
                Automated Audit Log ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
