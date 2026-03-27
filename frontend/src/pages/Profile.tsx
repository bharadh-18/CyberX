import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import axios from 'axios';
import { User as UserIcon, LockKeyhole, Calendar, KeyRound } from 'lucide-react';

interface ProfileData {
  id: string;
  email: string;
  roles: string[];
  created_at: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [mfaData, setMfaData] = useState<{ secret: string; qr_code_url: string } | null>(null);
  const [mfaError, setMfaError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/users/profile');
        setProfile(res.data);
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          setErrorMsg(err.response?.data?.detail || 'Failed to load profile');
        } else {
          setErrorMsg('Secure profile decryption failed');
        }
      }
    };
    fetchProfile();
  }, []);

  const setupMFA = async () => {
    try {
      setMfaError('');
      const res = await api.post('/auth/mfa/setup');
      setMfaData(res.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setMfaError(error.response?.data?.detail || 'Failed to setup MFA');
      } else {
        setMfaError('MFA provisioning error');
      }
    }
  };

  if (errorMsg) {
    return <div className="p-8 text-center text-red-400 mt-20">{errorMsg}</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center mt-20 text-slate-400 animate-pulse">Decrypting profile data...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-6 mt-8 space-y-6">
      
      {/* Profile Overview Card */}
      <div className="w-full max-w-md glass-card p-8 border-t-4 border-cyan-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20">
              <UserIcon className="w-10 h-10 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-2 truncate px-4">{profile.email}</h2>
          <div className="flex items-center justify-center gap-2">
            {profile.roles.map(role => (
              <span key={role} className="px-2.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-full border border-cyan-500/20 uppercase tracking-widest">{role}</span>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-white/5 relative z-10">
          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <LockKeyhole className="w-4 h-4" />
              <span>User ID</span>
            </div>
            <span className="font-mono text-xs text-slate-300 w-32 truncate text-right">{profile.id}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <Calendar className="w-4 h-4" />
              <span>Joined</span>
            </div>
            <span className="text-sm text-slate-300 font-medium">
              {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
            <div className="flex items-center gap-3 text-emerald-400/80 text-sm">
              <LockKeyhole className="w-4 h-4" />
              <span>Data Protection</span>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded">AES-256-GCM Encrypted</span>
          </div>
        </div>
      </div>

      {/* Security Settings Card */}
      <div className="w-full max-w-md glass-card p-6 border-t-4 border-pink-500">
        <div className="flex items-center gap-3 mb-4">
          <KeyRound className="w-6 h-6 text-pink-500" />
          <h3 className="font-semibold text-lg">Two-Factor Auth (MFA)</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Enable Time-based One-Time Passwords (TOTP) to secure your logins.
        </p>
        
        {!mfaData ? (
          <div>
            {mfaError && <div className="text-sm text-red-400 mb-3 bg-red-500/10 p-2 rounded">{mfaError}</div>}
            <button onClick={setupMFA} className="btn-primary py-2 px-6 rounded-md text-sm font-semibold w-full sm:w-auto">Setup Authenticator</button>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-sm mb-2 text-emerald-400">✅ MFA Provisioned</h4>
            <p className="text-xs text-slate-400 mb-2">Manually enter this secret into Google Authenticator or Authy to complete setup. You will be prompted for codes upon your next login.</p>
            <code className="block p-3 bg-black/50 rounded text-pink-400 font-mono text-xs tracking-widest text-center break-all">
              {mfaData.secret}
            </code>
          </div>
        )}
      </div>

    </div>
  );
}
