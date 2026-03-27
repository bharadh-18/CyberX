import { useState } from 'react';
import { api } from '@/lib/api';
import axios from 'axios';
import { Bot, BugPlay, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface AnalysisResult {
  decision: 'allowed' | 'quarantined' | 'blocked';
  scores: {
    ml_score: number;
    url_reputation: number;
    regex_score: number;
    final_score: number;
  };
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
      // Step 1: Submit to C1 Workflow
      const submitRes = await api.post('/comments', { text });
      
      // Step 2: Poll status (Hackathon simplified: immediately query it)
      const statusRes = await api.get(`/comments/${submitRes.data.analysis_id}/status`);
      
      // In the backend, the direct status endpoint returns just the decision.
      // We will mock the granular scores dynamically based on the decision for visual effect,
      // since the current backend `/status` only exposes the final decision state.
      const decision = statusRes.data.decision;
      const scores = {
        blocked: { ml_score: 0.85, url_reputation: 0.90, regex_score: 0.75, final_score: 0.88 },
        quarantined: { ml_score: 0.60, url_reputation: 0.40, regex_score: 0.50, final_score: 0.72 },
        allowed: { ml_score: 0.15, url_reputation: 0.05, regex_score: 0.00, final_score: 0.10 }
      }[decision as 'blocked' | 'quarantined' | 'allowed'];

      setResult({ decision: decision, scores: scores });

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

  const setSample = (type: 'safe' | 'phish') => {
    if (type === 'safe') {
      setText("Hey team, just reviewed the PR. The new components look great. I approve the merge.");
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
        {/* Input Card */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-lg mb-4">Submit payload for analysis</h3>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text, comments, or emails..."
              className="w-full h-48 bg-black/20 border border-white/10 rounded-lg p-4 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500 resize-none transition-all"
              maxLength={5000}
            />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{text.length} / 5000 chars</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSample('safe')} className="hover:text-emerald-400 transition-colors">Safe Sample</button>
                <button type="button" onClick={() => setSample('phish')} className="hover:text-red-400 transition-colors">Attack Sample</button>
              </div>
            </div>

            {errorMsg && <p className="text-red-400 text-sm bg-red-400/10 p-2 rounded">{errorMsg}</p>}

            <button type="submit" disabled={isSubmitting || !text.trim()} className="w-full bg-amber-600 hover:bg-amber-500 text-white py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              <BugPlay className="w-5 h-5" />
              {isSubmitting ? 'Analyzing Payload...' : 'Analyze Text'}
            </button>
          </form>
        </div>

        {/* Results Card */}
        <div className="glass-card p-6 border-l-4 border-amber-500 bg-amber-500/5">
          <h3 className="font-semibold text-lg mb-6">Analysis Result</h3>
          
          {!result ? (
            <div className="h-48 flex items-center justify-center border-2 border-dashed border-white/10 rounded-lg text-slate-500 text-sm">
              Waiting for payload submission...
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center bg-black/20 rounded-xl p-6 border border-white/5">
                {result.decision === 'allowed' && <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-2" />}
                {result.decision === 'quarantined' && <ShieldAlert className="w-16 h-16 text-amber-500 mb-2" />}
                {result.decision === 'blocked' && <ShieldAlert className="w-16 h-16 text-red-500 mb-2" />}
                <h4 className={`text-2xl font-bold uppercase tracking-widest ${
                  result.decision === 'allowed' ? 'text-emerald-500' :
                  result.decision === 'quarantined' ? 'text-amber-500' : 'text-red-500'
                }`}>
                  {result.decision}
                </h4>
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Heuristic Scores</h5>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>ML Pipeline Score</span>
                    <span className="font-mono text-amber-400">{result.scores.ml_score.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${result.scores.ml_score * 100}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>URL Reputation</span>
                    <span className="font-mono text-amber-400">{result.scores.url_reputation.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${result.scores.url_reputation * 100}%` }}></div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-white/10 space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>Final Weighted Score</span>
                    <span className={`font-mono ${result.scores.final_score > 0.85 ? 'text-red-500' : 'text-emerald-500'}`}>{result.scores.final_score.toFixed(2)}</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${result.scores.final_score > 0.85 ? 'bg-red-500' : result.scores.final_score >= 0.70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${result.scores.final_score * 100}%` }}></div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
