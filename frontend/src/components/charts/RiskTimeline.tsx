import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface TimelineData {
  timestamps: string[];
  risk_scores: number[];
  event_labels: string[];
}

export default function RiskTimeline() {
  const [data, setData] = useState<TimelineData | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/security/risk-timeline');
        setData(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!data || data.timestamps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        No risk timeline data available yet
      </div>
    );
  }

  const labels = data.timestamps.map(t =>
    new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Risk Score',
        data: data.risk_scores,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: data.risk_scores.map(s =>
          s >= 0.8 ? '#ef4444' : s >= 0.5 ? '#f59e0b' : '#10b981'
        ),
        pointBorderColor: 'transparent',
        pointRadius: 5,
        pointHoverRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(99, 102, 241, 0.3)',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        padding: 12,
        callbacks: {
          afterBody: (ctx: any) => {
            const idx = ctx[0]?.dataIndex;
            if (idx !== undefined && data.event_labels[idx]) {
              return `Event: ${data.event_labels[idx]}`;
            }
            return '';
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { color: 'rgba(255,255,255,0.03)' },
      },
      y: {
        min: 0,
        max: 1,
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (v: any) => `${(v * 100).toFixed(0)}%`,
        },
        grid: { color: 'rgba(255,255,255,0.03)' },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}
