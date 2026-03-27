import { useState } from 'react';
import { api } from '@/lib/api';
import axios from 'axios';
import { Bot, BugPlay, ShieldAlert, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';

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
      // Step 1: Submit to ML Pipeline
      const submitRes = await api.post('/comments', { text });
      
      // The backend now returns real ML scores directly!
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
          <Bot className="w-8 h-8 text-cyan-500" />
          AI Phishing Analyzer
        </h1>
        <p className="text-[var(--text-secondary)] mt-2">Submit text to analyze against our weighted heuristic phishing model</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Card */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-lg mb-4">Submit payload for analysis</h3>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text, comments, or emails..."
              className="w-full h-48 bg-[#020617] border border-slate-800 rounded-lg p-4 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500 resize-none transition-all"
              maxLength={5000}
            />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{text.length} / 5000 chars</span>
              <div className="flex gap-3">
                <button type="button" onClick={() => setSample('safe')} className="hover:text-emerald-400 transition-colors">Safe Sample</button>
                <button type="button" onClick={() => setSample('bec')} className="hover:text-amber-400 transition-colors">BEC Sample</button>
                <button type="button" onClick={() => setSample('phish')} className="hover:text-red-400 transition-colors">Attack Sample</button>
              </div>
            </div>

            {errorMsg && <p className="text-red-400 text-sm bg-red-400/10 p-2 rounded border border-red-500/20">{errorMsg}</p>}

            <button type="submit" disabled={isSubmitting || !text.trim()} className="w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-lg disabled:opacity-50">
              <BugPlay className="w-5 h-5" />
              {isSubmitting ? 'Analyzing Payload...' : 'Analyze Text'}
            </button>
          </form>
        </div>

        {/* Results Card */}
        <div className="glass-card p-6 border-l-4 border-cyan-500 bg-cyan-500/5">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            Analysis Result
          </h3>
          
          {!result ? (
            <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-lg text-slate-500 text-sm">
              Waiting for payload submission...
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center bg-black/20 rounded-xl p-6 border border-white/5">
                {result.decision === 'allowed' && <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-2" />}
                {result.decision === 'warning' && <AlertTriangle className="w-16 h-16 text-yellow-500 mb-2" />}
                {result.decision === 'zero_day' && <Zap className="w-16 h-16 text-orange-500 mb-2 animate-pulse" />}
                {result.decision === 'blocked' && <ShieldAlert className="w-16 h-16 text-red-500 mb-2" />}
                <h4 className={`text-2xl font-bold uppercase tracking-widest ${
                  result.decision === 'allowed' ? 'text-emerald-500' :
                  result.decision === 'warning' ? 'text-yellow-500' :
                  result.decision === 'zero_day' ? 'text-orange-500' : 'text-red-500'
                }`}>
                  {result.decision === 'zero_day' ? '⚠ ZERO-DAY PHISH' :
                   result.decision === 'warning' ? 'CAUTION' : result.decision}
                </h4>
                {result.decision === 'zero_day' && (
                  <p className="text-xs text-orange-400/80 mt-1">Unknown URL detected with high ML suspicion</p>
                )}
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Heuristic Scores</h5>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>ML Pipeline Score</span>
                    <span className="font-mono text-cyan-400">{result.scores.ml_score.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 transition-all duration-1000 shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${result.scores.ml_score * 100}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>URL Reputation</span>
                    <span className="font-mono text-cyan-400">{result.scores.url_reputation.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 transition-all duration-1000 shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${result.scores.url_reputation * 100}%` }}></div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-white/10 space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>Final Weighted Score <span className="text-xs text-slate-500 font-normal">(ML×0.8 + URL×0.2)</span></span>
                    <span className={`font-mono ${result.scores.final_score > 0.6 ? 'text-red-500' : result.scores.final_score > 0.45 ? 'text-yellow-500' : 'text-emerald-500'}`}>{result.scores.final_score.toFixed(2)}</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${result.scores.final_score > 0.6 ? 'bg-red-500' : result.scores.final_score > 0.45 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${result.scores.final_score * 100}%` }}></div>
                  </div>
                </div>

                {result.threat_indicators.length > 0 && (
                  <div className="pt-4 mt-4 border-t border-white/10">
                    <h5 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">Threat Indicators</h5>
                    <ul className="space-y-1">
                      {result.threat_indicators.map((t, i) => (
                        <li key={i} className="text-xs text-red-400/80 flex items-start gap-1.5">
                          <span className="text-red-500 mt-0.5">•</span> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.trust_factors.length > 0 && (
                  <div className="pt-4 mt-4 border-t border-white/10">
                    <h5 className="text-sm font-semibold text-emerald-400 uppercase tracking-widest mb-2">Trust Factor</h5>
                    <ul className="space-y-1">
                      {result.trust_factors.map((t, i) => (
                        <li key={i} className="text-xs text-emerald-400/80 flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5">✓</span> {t}
                        </li>
                      ))}
                    </ul>
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
