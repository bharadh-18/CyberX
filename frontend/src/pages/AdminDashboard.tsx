import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Users, Shield, AlertTriangle, Activity, Crown } from 'lucide-react';

interface UserRow {
  user_id: string;
  email_hash: string;
  status: string;
  roles: string[];
  risk: string;
  failed_attempts: number;
  total_events: number;
  high_risk_events: number;
}

const RISK_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
  HIGH: 'bg-red-500/15 text-red-400 border-red-500/20',
  MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  LOW: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  locked: 'bg-red-500/15 text-red-400',
  suspended: 'bg-amber-500/15 text-amber-400',
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/security/admin/users');
        setUsers(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const criticalCount = users.filter(u => u.risk === 'CRITICAL' || u.risk === 'HIGH').length;
  const activeCount = users.filter(u => u.status === 'active').length;
  const lockedCount = users.filter(u => u.status === 'locked').length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 mt-16 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Crown className="w-8 h-8 text-amber-500" />
          Admin Control Center
        </h1>
        <p className="text-[var(--text-secondary)]">Organization-wide user management and risk monitoring</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 border-l-4 border-indigo-500">
          <div className="flex justify-between items-start mb-2">
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Total Users</div>
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-indigo-400">{users.length}</div>
        </div>
        <div className="glass-card p-5 border-l-4 border-emerald-500">
          <div className="flex justify-between items-start mb-2">
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Active</div>
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400">{activeCount}</div>
        </div>
        <div className="glass-card p-5 border-l-4 border-red-500">
          <div className="flex justify-between items-start mb-2">
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest">High Risk</div>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-red-400">{criticalCount}</div>
        </div>
        <div className="glass-card p-5 border-l-4 border-amber-500">
          <div className="flex justify-between items-start mb-2">
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Locked</div>
            <Activity className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400">{lockedCount}</div>
        </div>
      </div>

      {/* User Table */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          Registered Users
        </h3>

        {loading ? (
          <div className="h-40 flex items-center justify-center text-slate-500 animate-pulse">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-500">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">User ID</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Roles</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Risk Level</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Events</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">High Risk</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Failed Logins</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.user_id}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${user.risk === 'CRITICAL' || user.risk === 'HIGH' ? 'bg-red-500/5' : ''}`}
                  >
                    <td className="py-3 px-4 font-mono text-xs text-slate-300">{user.user_id.substring(0, 16)}...</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${STATUS_BADGE[user.status] || 'bg-slate-500/15 text-slate-400'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">{user.roles.join(', ')}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md border ${RISK_BADGE[user.risk] || RISK_BADGE.LOW}`}>
                        {user.risk}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-slate-300">{user.total_events}</td>
                    <td className="py-3 px-4 text-right font-mono text-sm">
                      <span className={user.high_risk_events > 0 ? 'text-red-400' : 'text-slate-500'}>
                        {user.high_risk_events}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm">
                      <span className={user.failed_attempts > 2 ? 'text-amber-400' : 'text-slate-500'}>
                        {user.failed_attempts}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
