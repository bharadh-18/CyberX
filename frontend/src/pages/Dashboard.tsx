import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Activity, ShieldAlert, ShieldCheck, LockKeyhole, Ban, ActivitySquare, Server } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [metricsRes, eventsRes] = await Promise.all([
          api.get('/security/metrics'),
          api.get('/security/events')
        ]);
        setMetrics(metricsRes.data);
        setEvents(eventsRes.data);
      } catch (e) {
        console.error('Failed to fetch dashboard telemetry', e);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000); // Relaxed polling to 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 mt-16 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Command Center</h1>
          <p className="text-[var(--text-secondary)] mt-1">Real-time observability into zero-trust telemetry</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-lg">Event Frequency Radar</h3>
          </div>
          <div className="h-72 w-full">
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

        <div className="glass-card p-6 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-lg">System Audit Log</h3>
          </div>
          
          <div className="overflow-y-auto flex-1 h-[288px] pr-2 custom-scrollbar">
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
                          ${evt.severity === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
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
    </div>
  );
}
