import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Radar, Search, Shield, AlertTriangle, Server, Wifi, Activity } from 'lucide-react';

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
  if (result.high_risk_ports.includes(port)) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (result.medium_risk_ports.includes(port)) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
};

const RISK_CONFIG: Record<string, { color: string; bgSoft: string; border: string; rawBg: string }> = {
  CRITICAL: { color: 'text-red-400', bgSoft: 'bg-red-500/10', border: 'border-red-500/20', rawBg: 'bg-red-500' },
  HIGH:     { color: 'text-orange-400', bgSoft: 'bg-orange-500/10', border: 'border-orange-500/20', rawBg: 'bg-orange-500' },
  MEDIUM:   { color: 'text-amber-400', bgSoft: 'bg-amber-500/10', border: 'border-amber-500/20', rawBg: 'bg-amber-500' },
  LOW:      { color: 'text-emerald-400', bgSoft: 'bg-emerald-500/10', border: 'border-emerald-500/20', rawBg: 'bg-emerald-500' },
  CLEAN:    { color: 'text-cyan-400', bgSoft: 'bg-cyan-500/10', border: 'border-cyan-500/20', rawBg: 'bg-cyan-500' },
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
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Radar className="w-8 h-8 text-cyan-500" />
          Network Threat Scanner
        </h1>
        <p className="text-[var(--text-secondary)]">Automated Nmap-powered port scanning with AI risk analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scan Controls */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-cyan-400" /> Target Configuration
          </h3>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Target IP Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ip}
                onChange={e => setIp(e.target.value)}
                placeholder="e.g. 127.0.0.1"
                className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              <button
                onClick={runScan}
                disabled={loading || !ip.trim()}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-50 text-cyan-950 font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Activity className="w-5 h-5 animate-spin" /> : <Radar className="w-5 h-5" />}
                {loading ? 'Scanning...' : 'Scan'}
              </button>
            </div>
            <p className="text-xs text-slate-500">Only private IP ranges allowed (127.x, 10.x, 172.16-31.x, 192.168.x)</p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {['127.0.0.1', '192.168.1.1', '10.0.0.1'].map(preset => (
              <button
                key={preset}
                onClick={() => setIp(preset)}
                className="px-3 py-1.5 text-xs font-mono rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Scan History */}
          {history.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Scan History</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {history.map((h, i) => {
                  const hcfg = RISK_CONFIG[h.risk_level] || RISK_CONFIG.LOW;
                  return (
                    <button
                      key={i}
                      onClick={() => setResult(h)}
                      className="w-full flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5 hover:border-white/10 transition-all text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-slate-500" />
                        <span className="font-mono text-sm">{h.ip}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{h.open_ports.length} ports</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${hcfg.bgSoft} ${hcfg.color} border ${hcfg.border}`}>
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
        <div className="glass-card p-6 flex flex-col">
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-cyan-400" /> Scan Results
          </h3>

          {!result ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl p-12 text-center">
              <Wifi className="w-16 h-16 text-slate-800 mb-4" />
              <div className="text-slate-500 font-medium">No Scan Data</div>
              <p className="text-slate-600 text-sm mt-1">Enter a target IP and run a scan</p>
            </div>
          ) : (
            <div className="space-y-6 flex-1">
              {/* Risk Score Header */}
              <div className="flex flex-col items-center p-6 bg-slate-950/50 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className={`absolute inset-0 opacity-10 blur-3xl rounded-full ${cfg?.rawBg}`} />
                <div className={`text-5xl font-black font-mono mb-1 ${cfg?.color}`}>
                  {(result.risk_score * 100).toFixed(0)}%
                </div>
                <div className={`px-4 py-1 text-xs font-black uppercase tracking-[0.2em] rounded-full border ${cfg?.bgSoft} ${cfg?.color} border-current/20`}>
                  {result.risk_level}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span>Host: <span className="text-slate-300">{result.host_status}</span></span>
                  <span>Method: <span className="text-slate-300">{result.scan_method}</span></span>
                  <span>IP: <span className="font-mono text-slate-300">{result.ip}</span></span>
                </div>
              </div>

              {/* Open Ports */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Open Ports ({result.open_ports.length})
                </h4>
                {result.open_ports.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.services.map((svc, i) => (
                      <div
                        key={i}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono ${PORT_COLOR(svc.port, result)}`}
                      >
                        <span className="font-bold">{svc.port}</span>
                        <span className="opacity-60 ml-1">/{svc.service}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No open ports detected</p>
                )}
              </div>

              {/* Anomalies */}
              {result.anomalies.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Threat Analysis</h4>
                  <div className="space-y-2">
                    {result.anomalies.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-300 bg-black/20 p-2.5 rounded-lg border border-white/5">
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl text-xs text-cyan-300/80 italic">
                Scan logged to Security Command Center. Time: {new Date(result.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
