'use client';

import { useState, useEffect } from 'react';

const PROMPTS = [
  "Write a short email to your boss explaining you'll be a day late on a project.",
  "Describe your morning routine in five sentences.",
  "Explain why you'd make a good candidate for a promotion.",
  "Write a message convincing a friend to try your favorite restaurant.",
  "Describe a challenge you faced at work and how you solved it.",
];

type Correction = { original: string; fixed: string; why: string; tag: string };
type Scores = { grammar: number; tense: number; vocabulary: number; clarity: number; natural: number; overall: number };
type Result = { rewrite: string; corrections: Correction[]; scores: Scores };

const RING_COLORS: Record<string, string> = {
  overall: '#7C3AED',
  grammar: '#059669',
  tense: '#0EA5E9',
  vocabulary: '#F59E0B',
  clarity: '#EC4899',
  natural: '#6366F1',
};

function ScoreRing({ label, value, color, delay = 0 }: { label: string; value: number; color: string; delay?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDisplay(value), 150 + delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c - (display / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[72px] h-[72px]">
        <svg width="72" height="72" className="-rotate-90 absolute inset-0">
          <circle cx="36" cy="36" r={r} stroke="rgba(30,27,46,0.08)" strokeWidth="6" fill="none" />
          <circle
            cx="36" cy="36" r={r} stroke={color} strokeWidth="6" fill="none"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-display font-bold text-[15px] text-[#1E1B2E]">
          {display}
        </div>
      </div>
      <span className="font-mono text-[9.5px] tracking-wider uppercase text-[#6B6478]">{label}</span>
    </div>
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [history, setHistory] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(setHistory).catch(() => { });
  }, [result]); // refetches every time a new check completes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function newPrompt() {
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, prompt }),
      });
      const data = await res.json();
      if (data.error) setError('Something went wrong reading that — try again.');
      else setResult(data);
    } catch {
      setError('Could not reach the server — check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#EEF2FF] via-[#F5F3FF] to-[#FDF4FF] flex justify-center py-14 px-4">
      {/* animated background blobs */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 rounded-full bg-violet-300/40 blur-3xl animate-[blob-float_20s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-[28rem] h-[28rem] rounded-full bg-fuchsia-300/30 blur-3xl animate-[blob-float_24s_ease-in-out_infinite_reverse]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-amber-200/30 blur-3xl animate-[blob-float_17s_ease-in-out_infinite]" />

      <div className="relative w-full max-w-2xl bg-white/70 backdrop-blur-xl rounded-[28px] shadow-[0_20px_60px_-15px_rgba(76,29,149,0.35)] border border-white/60 px-10 py-10 sm:px-14 sm:py-12">
        <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 mb-2">
          ✦ Marginal · Daily Practice
        </p>
        <h1 className="font-display font-bold text-4xl text-[#1E1B2E] mb-2 tracking-tight">Today's page</h1>
        <p className="text-[15px] text-[#6B6478] mb-8">
          Write a little. I'll light up what's working and fix what's not.
        </p>

        <div className="relative bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-2xl p-5 mb-7 border border-violet-100">
          <p className="font-mono text-[10px] tracking-widest uppercase text-violet-500">Prompt</p>
          <p className="font-display text-lg text-[#1E1B2E] mt-1.5">{prompt}</p>
          <button
            onClick={newPrompt}
            className="font-mono text-[11px] text-violet-600 hover:text-violet-800 mt-3 cursor-pointer transition-colors inline-flex items-center gap-1"
          >
            ↻ shuffle prompt
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start writing here..."
          className="w-full min-h-[140px] bg-white/60 rounded-2xl border border-violet-100 p-4 font-sans text-[16px] leading-relaxed text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-y transition-shadow"
        />

        <div className="flex justify-end mt-5">
          <button
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
            className="relative font-mono text-xs tracking-wider uppercase text-white px-7 py-3.5 rounded-full cursor-pointer
                       bg-gradient-to-r from-violet-600 to-fuchsia-500 disabled:opacity-40 disabled:cursor-default
                       shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.03] active:scale-[0.98]
                       transition-all duration-200"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-[spin-slow_0.7s_linear_infinite]" />
                Reading closely
              </span>
            ) : (
              'Check my writing'
            )}
          </button>
        </div>

        {error && (
          <p className="font-mono text-xs text-rose-500 mt-4 animate-[fade-slide-up_0.3s_ease-out]">{error}</p>
        )}

        {result && (
          <div className="mt-10 animate-[fade-slide-up_0.5s_ease-out]">
            <div className="flex gap-3 flex-wrap justify-between sm:justify-start sm:gap-6 pb-8 mb-8 border-b border-violet-100">
              {(['overall', 'grammar', 'tense', 'vocabulary', 'clarity', 'natural'] as const).map((key, i) => (
                <ScoreRing key={key} label={key} value={result.scores[key]} color={RING_COLORS[key]} delay={i * 80} />
              ))}
            </div>

            <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 mb-3">✦ Cleaner version</p>
            <p className="font-sans text-[16px] leading-relaxed text-[#1E1B2E] bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5 mb-9">
              {result.rewrite}
            </p>

            <p className="font-mono text-[10px] tracking-widest uppercase text-violet-500 mb-3">What changed, and why</p>
            <div className="space-y-3">
              {result.corrections.map((c, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 rounded-2xl bg-white/70 border border-violet-100 hover:border-violet-300 transition-colors"
                  style={{ animation: `fade-slide-up 0.4s ease-out ${i * 90}ms both` }}
                >
                  <span className="font-mono text-xs font-bold text-violet-400 min-w-[20px] pt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <span className="font-sans text-[14.5px] text-rose-400 line-through">{c.original}</span>
                    <span className="text-[#6B6478] mx-2">→</span>
                    <span className="font-sans text-[14.5px] font-medium text-emerald-600">{c.fixed}</span>
                    <p className="text-[13.5px] text-[#6B6478] mt-1.5">{c.why}</p>
                    <span className="inline-block font-mono text-[9.5px] tracking-wide uppercase bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full mt-2">
                      {c.tag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-12 pt-8 border-t border-violet-100">
            <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 mb-4">
              ✦ Your history
            </p>
            <div className="space-y-2">
               {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-white/60 border border-violet-100 hover:border-violet-300 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-[13.5px] text-[#1E1B2E] truncate">
                      {entry.text}
                    </p>
                    <p className="font-mono text-[10px] text-[#9CA3AF] mt-1">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex-shrink-0 font-display font-bold text-lg text-violet-600">
                    {entry.scores?.overall ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}    
      </div>
    </main>
  );
}