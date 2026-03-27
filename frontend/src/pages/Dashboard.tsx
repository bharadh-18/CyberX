import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Activity, ShieldAlert, ShieldCheck, LockKeyhole, Ban, ActivitySquare, Server, TrendingUp, MapPin, BarChart3, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import RiskTimeline from '@/components/charts/RiskTimeline';
import LoginMap from '@/components/charts/LoginMap';
import BehaviorComparison from '@/components/charts/BehaviorComparison';

interface SecurityMetrics {
  active_sessions: number;
  failed_logins_24h: number;
  ips_blocked: number;
  phishing_payloads_blocked: number;
  threat_level: string;
  system_load: string;
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  event: string;
  severity: string;
  ip: string;
  details?: Record<string, any>;
}

interface ChartPoint {
  time: string;
  count: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  // Memoize chart data to prevent expensive recalculations on every render
  const chartData = useMemo(() => {
    const data = events.reduce((acc: ChartPoint[], current) => {
      const time = new Date(current.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const existing = acc.find(item => item.time === time);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ time, count: 1 });
      }
      return acc;
    }, []);
    return [...data].reverse(); // Oldest to newest
  }, [events]);

  // Fetch aggregated metrics from FastAPI (server-side computation)
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/security/metrics');
        setMetrics(res.data);
      } catch (e) {
        console.error('Failed to fetch metrics', e);
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch security events from FastAPI (Authorized REST call instead of client-side Firestore)
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get('/security/events');
        setEvents(res.data);
      } catch (e) {
        console.error('Failed to fetch events', e);
      }
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 mt-16 space-y-8 animate-fade-up" style={{ animationDuration: '0.8s' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Security Command Center</h1>
          <p className="text-[var(--text-secondary)] mt-2 font-medium">Real-time observability into zero-trust telemetry</p>
        </div>
        {metrics && (
          <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center gap-3">
            <Server className="w-5 h-5 text-indigo-400" />
            <div className="text-right">
              <div className="text-xs text-[var(--text-secondary)]">System Load</div>
              <div className="font-mono text-sm font-semibold">{metrics.system_load} %</div>
            </div>
          </div>
        )}
      </div>

      {metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 border-l-4 border-emerald-500">
            <div className="flex justify-between items-start mb-2">
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Active Sessions</div>
              <LockKeyhole className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-3xl font-bold font-mono text-emerald-400">{metrics.active_sessions}</div>
          </div>
          <div className="glass-card p-5 border-l-4 border-amber-500">
            <div className="flex justify-between items-start mb-2">
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Failed Logins (24H)</div>
              <ActivitySquare className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-3xl font-bold font-mono text-amber-400">{metrics.failed_logins_24h}</div>
          </div>
          <div className="glass-card p-5 border-l-4 border-red-500">
            <div className="flex justify-between items-start mb-2">
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest">WAF IPs Blocked</div>
              <Ban className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-3xl font-bold font-mono text-red-400">{metrics.ips_blocked}</div>
          </div>
          <div className="glass-card p-5 border-l-4 border-purple-500">
            <div className="flex justify-between items-start mb-2">
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Phish Triggers</div>
              <ShieldAlert className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold font-mono text-purple-400">{metrics.phishing_payloads_blocked}</div>
          </div>
        </div>
      ) : (
        <div className="h-32 glass-card animate-pulse flex items-center justify-center text-slate-500">Loading telemetry...</div>
      )}

      {/* ── Row 2: Risk Timeline + Audit Log ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-up" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
        <div className="lg:col-span-2 glass-card p-6 h-[400px] flex flex-col hover:border-indigo-500/30">
          <div className="flex items-center gap-3 mb-6 shrink-0">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="font-semibold text-lg tracking-wide">Risk Score Timeline</h3>
          </div>
          <div className="flex-1 min-h-0 w-full">
            <RiskTimeline />
          </div>
        </div>

        <div className="glass-card p-6 overflow-hidden flex flex-col h-[400px] hover:border-emerald-500/30">
          <div className="flex items-center gap-3 mb-6 shrink-0">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="font-semibold text-lg tracking-wide">System Audit Log</h3>
          </div>
          
          <div className="overflow-y-auto flex-1 min-h-0 pr-2 custom-scrollbar">
            {events.length > 0 ? (
              <table className="w-full text-left text-sm">
                <tbody>
                  {events.map((evt) => (
                    <tr key={evt.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="py-3">
                        <div className="font-medium text-slate-200">{evt.event}</div>
                        <div className="text-xs text-slate-500 mt-0.5 tracking-wider">{new Date(evt.timestamp).toLocaleString()}</div>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md tracking-wider
                          ${evt.severity === 'HIGH' || evt.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                            evt.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
                            'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
                          {evt.severity}
                        </span>
                        <div className="text-xs text-slate-400 mt-1 font-mono">{evt.ip}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 pb-10">No recent events</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: Event Frequency + Explainable AI Alerts ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-up" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
        <div className="lg:col-span-2 glass-card p-6 h-[400px] flex flex-col hover:border-indigo-500/30">
          <div className="flex items-center gap-3 mb-6 shrink-0">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Activity className="w-5 h-5 text-indigo-500" />
            </div>
            <h3 className="font-semibold text-lg tracking-wide">Event Frequency Radar</h3>
          </div>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px' }}
                  itemStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Explainable AI Alerts Panel */}
        <div className="glass-card p-6 overflow-hidden flex flex-col h-[400px] hover:border-amber-500/30">
          <div className="flex items-center gap-3 mb-6 shrink-0">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="font-semibold text-lg tracking-wide">AI Alert Reasons</h3>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 pr-2 custom-scrollbar space-y-3">
            {events
              .filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL')
              .slice(0, 8)
              .map(evt => (
                <div key={evt.id} className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-400 uppercase">{evt.event}</span>
                    <span className="text-[10px] text-slate-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {evt.details?.anomalies && Array.isArray(evt.details.anomalies) ? (
                    <ul className="space-y-1">
                      {(evt.details.anomalies as string[]).map((reason: string, i: number) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      Risk Score: {evt.details?.risk_score ?? 'N/A'} — Severity: {evt.severity}
                    </div>
                  )}
                </div>
              ))}
            {events.filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL').length === 0 && (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No high-risk alerts detected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 4: Login Map + Behavior Comparison ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-up" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
        <div className="lg:col-span-2 glass-card p-6 h-[400px] flex flex-col hover:border-cyan-500/30">
          <div className="flex items-center gap-3 mb-6 shrink-0">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <MapPin className="w-5 h-5 text-cyan-500" />
            </div>
            <h3 className="font-semibold text-lg tracking-wide">Login Location Map</h3>
          </div>
          <div className="flex-1 min-h-0 w-full rounded-xl overflow-hidden shadow-inner border border-white/5">
            <LoginMap />
          </div>
        </div>

        <div className="glass-card p-6 overflow-hidden flex flex-col h-[400px] hover:border-indigo-500/30">
          <div className="flex items-center gap-3 mb-6 shrink-0">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
            </div>
            <h3 className="font-semibold text-lg tracking-wide">Behavior Comparison</h3>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            <BehaviorComparison />
          </div>
        </div>
      </div>
    </div>
  );
}
