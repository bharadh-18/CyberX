import { useState } from 'react';
import { api } from '@/lib/api';
import axios from 'axios';
import { Bot, ShieldAlert, CheckCircle2, AlertTriangle, Zap, Search } from 'lucide-react';
import PremiumButton from '@/components/ui/PremiumButton';

interface AnalysisResult {
  decision: 'allowed' | 'warning' | 'blocked' | 'zero_day';
  scores: {
    ml_score: number;
    url_reputation: number;
    regex_score: number;
    final_score: number;
  };
  threat_indicators: string[];
  trust_factors: string[];
}

export default function PhishingAnalyzer() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    setResult(null);

    try {
      const submitRes = await api.post('/comments', { text });
      const data = submitRes.data;
      const decision = data.status === 'processing' ? 'warning' : data.status;

      setResult({
        decision: decision as 'allowed' | 'warning' | 'blocked' | 'zero_day',
        scores: {
          ml_score: data.ml_score ?? 0,
          url_reputation: data.url_reputation_score ?? 0,
          regex_score: data.regex_score ?? 0,
          final_score: data.final_score ?? 0,
        },
        threat_indicators: data.threat_indicators ?? [],
        trust_factors: data.trust_factors ?? [],
      });

    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(err.response?.data?.detail || 'Analysis failed. Make sure text is under 5000 chars.');
      } else {
        setErrorMsg('Security engine timeout.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const setSample = (type: 'safe' | 'phish' | 'bec') => {
    if (type === 'safe') {
      setText("Hey team, just reviewed the PR. The new components look great. I approve the merge.");
    } else if (type === 'bec') {
      setText("Hi, this is the CEO. I need you to urgently process a wire transfer of $45,000 to our new vendor. This is confidential — do not share with anyone else. Please send the payment confirmation to me directly. The invoice is attached.");
    } else {
      setText("URGENT: Your account has been compromised! Click http://bit.ly/secure-verify immediately to login and confirm your SSN and password to avoid suspension.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 mt-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Bot className="w-8 h-8 text-amber-500" />
          AI Phishing Analyzer
        </h1>
        <p className="text-[var(--text-secondary)] mt-2">Submit text to analyze against our weighted heuristic phishing model</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-6">
          <h3 className="font-semibold text-lg mb-4 text-white">Submit payload for analysis</h3>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text, comments, or emails..."
              className="w-full h-48 bg-[#000] border border-white/5 rounded-xl p-4 text-sm focus:outline-none focus:border-amber-500/30 font-mono resize-none transition-all placeholder:text-slate-600"
              maxLength={5000}
            />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{text.length} / 5000 chars</span>
              <div className="flex gap-3">
                <button type="button" onClick={() => setSample('safe')} className="hover:text-emerald-400 transition-colors uppercase font-bold tracking-widest">Safe</button>
                <button type="button" onClick={() => setSample('bec')} className="hover:text-amber-400 transition-colors uppercase font-bold tracking-widest">BEC</button>
                <button type="button" onClick={() => setSample('phish')} className="hover:text-red-400 transition-colors uppercase font-bold tracking-widest">Attack</button>
              </div>
            </div>

            {errorMsg && <p className="text-red-400 text-sm bg-red-400/10 p-2 rounded border border-red-500/20">{errorMsg}</p>}

            <PremiumButton 
              type="submit"
              disabled={isSubmitting || !text.trim()}
              label={isSubmitting ? 'Analyzing...' : 'Analyze Payload'}
              icon={Search}
              className="w-full flex justify-center mt-4"
            />
          </form>
        </div>

        <div className="glass-card p-6 border-l-4 border-amber-500/50 bg-amber-500/5">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2 text-white uppercase tracking-tighter">
            Analysis Result
          </h3>
          
          {!result ? (
            <div className="h-48 flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-slate-500 text-sm font-bold uppercase tracking-widest">
              Waiting for payload...
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center bg-black/40 rounded-3xl p-6 border border-white/5">
                {result.decision === 'allowed' && <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-2" />}
                {result.decision === 'warning' && <AlertTriangle className="w-16 h-16 text-amber-500 mb-2" />}
                {result.decision === 'zero_day' && <Zap className="w-16 h-16 text-orange-500 mb-2 animate-pulse" />}
                {result.decision === 'blocked' && <ShieldAlert className="w-16 h-16 text-red-500 mb-2" />}
                <h4 className={`text-2xl font-black uppercase tracking-tighter ${
                  result.decision === 'allowed' ? 'text-emerald-500' :
                  result.decision === 'warning' ? 'text-amber-500' :
                  result.decision === 'zero_day' ? 'text-orange-500' : 'text-red-500'
                }`}>
                  {result.decision === 'zero_day' ? '⚠ ZERO-DAY PHISH' :
                   result.decision === 'warning' ? 'CAUTION' : result.decision}
                </h4>
              </div>

              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Heuristic Telemetry</h5>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span>ML Pipeline Score</span>
                    <span className="font-mono text-amber-500">{(result.scores.ml_score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${result.scores.ml_score * 100}%` }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span>URL Reputation</span>
                    <span className="font-mono text-amber-500">{(result.scores.url_reputation * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${result.scores.url_reputation * 100}%` }}></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black uppercase tracking-widest text-white">Aggregated Risk Score</span>
                    <span className={`font-mono font-black text-xl ${result.scores.final_score > 0.6 ? 'text-red-500' : result.scores.final_score > 0.45 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {(result.scores.final_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <div className={`h-full rounded-full transition-all duration-1000 ${result.scores.final_score > 0.6 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : result.scores.final_score > 0.45 ? 'bg-amber-500 shadow-[0_0_100px_rgba(245,158,11,0.5)]' : 'bg-emerald-500'}`} style={{ width: `${result.scores.final_score * 100}%` }}></div>
                  </div>
                </div>

                {result.threat_indicators.length > 0 && (
                  <div className="pt-4 border-t border-white/5">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Threat Indicators</h5>
                    <div className="space-y-2">
                      {result.threat_indicators.map((t, i) => (
                        <div key={i} className="text-[10px] text-red-400/80 font-bold uppercase tracking-widest bg-red-500/5 p-2 rounded-lg border border-red-500/10 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> {t}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
