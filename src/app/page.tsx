'use client';

import { useState, useEffect, useRef } from 'react';

const WRITE_PROMPTS = [
  "Write a short email to your boss explaining you'll be a day late on a project.",
  "Describe your morning routine in five sentences.",
  "Explain why you'd make a good candidate for a promotion.",
  "Write a message convincing a friend to try your favorite restaurant.",
  "Describe a challenge you faced at work and how you solved it.",
];

const SPEAK_PROMPTS = [
  "Introduce yourself as if meeting a new colleague.",
  "Explain your job to someone outside your field.",
  "Describe your weekend plans.",
  "Give directions to your favorite coffee shop.",
  "Talk about a movie or show you watched recently.",
];

const SCENARIOS = [
  { id: 'interview', label: 'Job Interview', icon: '💼' },
  { id: 'client', label: 'Client Meeting', icon: '🤝' },
  { id: 'negotiation', label: 'Negotiation', icon: '⚖️' },
  { id: 'support', label: 'Customer Support', icon: '🎧' },
  { id: 'casual', label: 'Casual Chat', icon: '☕' },
];

type Correction = { original: string; fixed: string; why: string; tag: string };
type Scores = { grammar: number; tense: number; vocabulary: number; clarity: number; natural: number; overall: number };
type Result = { rewrite: string; corrections: Correction[]; scores: Scores; transcript?: string; id?: string };
type ChatMsg = { role: 'user' | 'model'; content: string };

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
  const [mode, setMode] = useState<'write' | 'speak' | 'talk'>('write');
  const [prompt, setPrompt] = useState(WRITE_PROMPTS[0]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [mistakes, setMistakes] = useState<{ tag: string; count: number }[]>([]);

  const [vocab, setVocab] = useState<{ original: string; fixed: string; count: number }[]>([]);

  const [activePanel, setActivePanel] = useState<'mistakes' | 'vocabulary' | 'history' | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [scenario, setScenario] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/history').then((r) => r.json()).then(setHistory).catch(() => { });
    fetch('/api/mistakes').then((r) => r.json()).then(setMistakes).catch(() => { });
  }, [result]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetch('/api/history').then((r) => r.json()).then(setHistory).catch(() => { });
    fetch('/api/mistakes').then((r) => r.json()).then(setMistakes).catch(() => { });
    fetch('/api/vocabulary').then((r) => r.json()).then(setVocab).catch(() => { });
  }, [result]);

  function newPrompt() {
    const list = mode === 'write' ? WRITE_PROMPTS : SPEAK_PROMPTS;
    setPrompt(list[Math.floor(Math.random() * list.length)]);
  }

  function switchMode(next: 'write' | 'speak' | 'talk') {
    setMode(next);
    setResult(null);
    setError('');
    setAudioBlob(null);
    setAudioUrl(null);
    setScenario(null);
    setMessages([]);
    setPrompt(next === 'write' ? WRITE_PROMPTS[0] : SPEAK_PROMPTS[0]);
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
      if (data.error) setError(data.error);
      else setResult(data);
    } catch {
      setError('Could not reach the server — check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach((track) => track.stop());
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function handleSpeakSubmit() {
    if (!audioBlob) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      const res = await fetch('/api/check-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64, mimeType: audioBlob.type, prompt }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch {
      setError('Could not process the recording — try again.');
    } finally {
      setLoading(false);
    }
  }

  function startScenario(id: string) {
    setScenario(id);
    setMessages([]);
    setResult(null);
    setError('');
  }

  async function sendChatMessage() {
    const content = chatInput.trim();
    if (!content || !scenario) return;
    const updated: ChatMsg[] = [...messages, { role: 'user', content }];
    setMessages(updated);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/roleplay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, messages: updated }),
      });
      const data = await res.json();
      if (data.reply) setMessages((m) => [...m, { role: 'model', content: data.reply }]);
    } catch {
      setError('Could not reach the server — check your connection.');
    } finally {
      setChatLoading(false);
    }
  }

  async function endConversation() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/roleplay-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, messages }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch {
      setError('Could not reach the server — check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#EEF2FF] via-[#F5F3FF] to-[#FDF4FF] flex justify-center py-14 px-4">
      <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 rounded-full bg-violet-300/40 blur-3xl animate-[blob-float_20s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-[28rem] h-[28rem] rounded-full bg-fuchsia-300/30 blur-3xl animate-[blob-float_24s_ease-in-out_infinite_reverse]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-amber-200/30 blur-3xl animate-[blob-float_17s_ease-in-out_infinite]" />

      <div className="relative w-full max-w-2xl bg-white/70 backdrop-blur-xl rounded-[28px] shadow-[0_20px_60px_-15px_rgba(76,29,149,0.35)] border border-white/60 px-10 py-10 sm:px-14 sm:py-12">
        <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 mb-2">
          ✦ Marginal · Daily Practice
        </p>
        <h1 className="font-display font-bold text-4xl text-[#1E1B2E] mb-2 tracking-tight">Today's page</h1>
        <p className="text-[15px] text-[#6B6478] mb-6">
          Write, speak, or talk it out. I'll light up what's working and fix what's not.
        </p>

        <div className="flex gap-2 mb-7">
          {(['write', 'speak', 'talk'] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`font-mono text-xs uppercase px-4 py-2 rounded-full transition-colors cursor-pointer ${mode === m ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-500'
                }`}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === 'write' && (
          <>
            <div className="relative bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-2xl p-5 mb-7 border border-violet-100">
              <p className="font-mono text-[10px] tracking-widest uppercase text-violet-500">Prompt</p>
              <p className="font-display text-lg text-[#1E1B2E] mt-1.5">{prompt}</p>
              <button onClick={newPrompt} className="font-mono text-[11px] text-violet-600 hover:text-violet-800 mt-3 cursor-pointer transition-colors inline-flex items-center gap-1">
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
                ) : 'Check my writing'}
              </button>
            </div>
          </>
        )}

        {mode === 'speak' && (
          <>
            <div className="relative bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-2xl p-5 mb-7 border border-violet-100">
              <p className="font-mono text-[10px] tracking-widest uppercase text-violet-500">Speaking topic</p>
              <p className="font-display text-lg text-[#1E1B2E] mt-1.5">{prompt}</p>
              <button onClick={newPrompt} className="font-mono text-[11px] text-violet-600 hover:text-violet-800 mt-3 cursor-pointer transition-colors inline-flex items-center gap-1">
                ↻ shuffle topic
              </button>
            </div>
            <div className="mb-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`font-mono text-xs uppercase px-6 py-3.5 rounded-full cursor-pointer transition-all
                    ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-gradient-to-r from-violet-600 to-fuchsia-500'} text-white`}
                >
                  {isRecording ? '● Stop recording' : '🎤 Start recording'}
                </button>
                {audioUrl && <audio src={audioUrl} controls className="h-9" />}
              </div>
              {audioUrl && (
                <div className="flex justify-end mt-5">
                  <button
                    onClick={handleSpeakSubmit}
                    disabled={loading}
                    className="font-mono text-xs tracking-wider uppercase text-white px-7 py-3.5 rounded-full cursor-pointer
                               bg-gradient-to-r from-violet-600 to-fuchsia-500 disabled:opacity-40
                               shadow-lg shadow-violet-500/30 hover:scale-[1.03] transition-all duration-200"
                  >
                    {loading ? 'Listening closely…' : 'Check my speaking'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {mode === 'talk' && (
          <>
            {!scenario ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => startScenario(s.id)}
                    className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 hover:border-violet-300 hover:scale-[1.03] transition-all cursor-pointer"
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <span className="font-sans text-[13px] text-[#1E1B2E] text-center">{s.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-violet-500">
                    {SCENARIOS.find((s) => s.id === scenario)?.icon} {SCENARIOS.find((s) => s.id === scenario)?.label}
                  </span>
                  <button
                    onClick={() => { setScenario(null); setMessages([]); }}
                    className="font-mono text-[10px] text-violet-400 hover:text-violet-600 cursor-pointer"
                  >
                    change scenario
                  </button>
                </div>

                <div className="bg-white/60 border border-violet-100 rounded-2xl p-4 h-72 overflow-y-auto mb-3 flex flex-col gap-3">
                  {messages.length === 0 && (
                    <p className="font-sans text-[13.5px] text-[#9CA3AF] italic m-auto">
                      Say hello to start the conversation.
                    </p>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[14px] font-sans leading-relaxed ${m.role === 'user'
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-br-sm'
                          : 'bg-violet-50 text-[#1E1B2E] rounded-bl-sm'
                          }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-violet-50 px-4 py-2.5 rounded-2xl rounded-bl-sm">
                        <span className="w-2 h-2 bg-violet-400 rounded-full inline-block animate-pulse" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !chatLoading && sendChatMessage()}
                    placeholder="Type your reply..."
                    className="flex-1 bg-white/60 rounded-full border border-violet-100 px-4 py-2.5 font-sans text-[14px] text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={chatLoading || !chatInput.trim()}
                    className="font-mono text-xs uppercase px-5 py-2.5 rounded-full cursor-pointer bg-violet-600 text-white disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>

                {messages.filter((m) => m.role === 'user').length >= 2 && (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={endConversation}
                      disabled={loading}
                      className="font-mono text-xs tracking-wider uppercase text-white px-7 py-3.5 rounded-full cursor-pointer
                                 bg-gradient-to-r from-violet-600 to-fuchsia-500 disabled:opacity-40
                                 shadow-lg shadow-violet-500/30 hover:scale-[1.03] transition-all duration-200"
                    >
                      {loading ? 'Reviewing…' : 'End & get feedback'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

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

            {result.transcript && (
              <>
                <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 mb-3">✦ What you said</p>
                <p className="font-sans text-[16px] leading-relaxed text-[#1E1B2E] bg-violet-50/60 border border-violet-100 rounded-2xl p-5 mb-9">
                  {result.transcript}
                </p>
              </>
            )}

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

        <div className="flex gap-2 mt-12 pt-8 border-t border-violet-100">
          {(['mistakes', 'vocabulary', 'history'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setActivePanel(activePanel === p ? null : p)}
              className={`font-mono text-xs uppercase px-4 py-2 rounded-full transition-colors cursor-pointer ${activePanel === p ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-500 hover:bg-violet-100'
                }`}
            >
              {p}
            </button>
          ))}
        </div>

        {activePanel === 'mistakes' && mistakes.length > 0 && (
          <div className="mt-6">
            <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 mb-4">✦ Your recurring mistakes</p>
            <div className="space-y-3">
              {mistakes.map((m) => {
                const max = mistakes[0].count;
                const pct = Math.max(8, (m.count / max) * 100);
                return (
                  <div key={m.tag} className="flex items-center gap-3">
                    <span className="font-sans text-[13px] text-[#1E1B2E] w-28 flex-shrink-0 truncate">{m.tag}</span>
                    <div className="flex-1 h-6 bg-violet-50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 rounded-full flex items-center justify-end pr-2 transition-all duration-700 ease-out"
                        style={{ width: `${pct}%` }}
                      >
                        <span className="font-mono text-[10px] text-white font-bold">{m.count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activePanel === 'vocabulary' && vocab.length > 0 && (
          <div className="mt-6">
            <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 mb-4">
              ✦ Vocabulary you've upgraded
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {vocab.map((v, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 hover:border-violet-300 hover:scale-[1.03] transition-all"
                >
                  <p className="font-sans text-[13px] text-rose-400 line-through">{v.original}</p>
                  <p className="font-display font-semibold text-[15px] text-emerald-600 mt-0.5">{v.fixed}</p>
                  {v.count > 1 && (
                    <p className="font-mono text-[9.5px] text-violet-400 mt-2">used {v.count}×</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activePanel === 'history' && history.length > 0 && (
          <div className="mt-6">
            <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 mb-4">✦ Your history</p>
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-white/60 border border-violet-100 hover:border-violet-300 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-[13.5px] text-[#1E1B2E] truncate">{entry.text}</p>
                    <p className="font-mono text-[10px] text-[#9CA3AF] mt-1">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex-shrink-0 font-display font-bold text-lg text-violet-600">{entry.scores?.overall ?? '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}