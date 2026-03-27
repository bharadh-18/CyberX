import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { TrendingUp, TrendingDown, Minus, Shield, AlertTriangle } from 'lucide-react';

interface Metrics {
  event_count: number;
  avg_risk_score: number;
  high_risk_events: number;
  unique_ips: number;
}

interface ComparisonData {
  baseline: Metrics;
  current: Metrics;
}

function MetricCard({ label, baseline, current, suffix = '' }: { label: string; baseline: number; current: number; suffix?: string }) {
  const delta = current - baseline;
  const isWorse = delta > 0;
  const isNeutral = delta === 0;

  return (
    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{label}</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] text-emerald-400/70 uppercase mb-1">Baseline</div>
          <div className="text-xl font-bold font-mono text-emerald-400">{baseline}{suffix}</div>
        </div>
        <div>
          <div className="text-[10px] text-indigo-400/70 uppercase mb-1">Current</div>
          <div className="text-xl font-bold font-mono text-indigo-400">{current}{suffix}</div>
        </div>
      </div>
      <div className={`flex items-center gap-1 mt-3 text-xs font-semibold ${isNeutral ? 'text-slate-500' : isWorse ? 'text-red-400' : 'text-emerald-400'}`}>
        {isNeutral ? <Minus className="w-3 h-3" /> : isWorse ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isNeutral ? 'No change' : `${isWorse ? '+' : ''}${delta.toFixed(2)} ${isWorse ? '(Elevated)' : '(Improved)'}`}
      </div>
    </div>
  );
}

export default function BehaviorComparison() {
  const [data, setData] = useState<ComparisonData | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/security/behavior-comparison');
        setData(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetch();
  }, []);

  if (!data || !data.baseline?.event_count) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        Insufficient data for behavior comparison
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Baseline</span>
        </div>
        <span className="text-[10px] text-slate-600">vs</span>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Current</span>
        </div>
      </div>

      <MetricCard
        label="Average Risk Score"
        baseline={data.baseline.avg_risk_score}
        current={data.current.avg_risk_score}
      />
      <MetricCard
        label="High-Risk Events"
        baseline={data.baseline.high_risk_events}
        current={data.current.high_risk_events}
      />
      <MetricCard
        label="Unique IPs"
        baseline={data.baseline.unique_ips}
        current={data.current.unique_ips}
      />
      <MetricCard
        label="Total Events"
        baseline={data.baseline.event_count}
        current={data.current.event_count}
      />
    </div>
  );
}
