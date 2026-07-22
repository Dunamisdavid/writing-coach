'use client';

import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';


type Correction = { original: string; fixed: string; why: string; tag: string };
type Scores = {
  grammar: number; tense: number; vocabulary: number; clarity: number; natural: number; overall: number;
  pronunciation?: number;
};
type Result = {
  rewrite: string; corrections: Correction[]; scores: Scores; id?: string;
  transcript?: string; feedback?: string;
  fillerWordCount?: number; fillerWordsFound?: string[]; pronunciationNotes?: string;
};
type ChatMsg = { role: 'user' | 'model'; content: string };
type Scenario = { label: string; icon: string; persona: string };
type DrillQ = { sentence: string; options: string[]; correctIndex: number; explanation: string };

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
  const [mode, setMode] = useState<'write' | 'speak' | 'talk' | 'drill' | 'rewrite'>('write');
  const [writePrompts, setWritePrompts] = useState<string[]>(['Loading a prompt for you...']);
  const [speakPrompts, setSpeakPrompts] = useState<string[]>(['Loading a topic for you...']);
  const [rewriteSentences, setRewriteSentences] = useState<string[]>(['Loading a sentence for you...']);
  const [promptLoading, setPromptLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  const [history, setHistory] = useState<any[]>([]);
  const [mistakes, setMistakes] = useState<{ tag: string; count: number }[]>([]);
  const [vocab, setVocab] = useState<{ original: string; fixed: string; count: number }[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [streak, setStreak] = useState<{ streak: number; practicedToday: boolean } | null>(null);
  const [activePanel, setActivePanel] = useState<'progress' | 'mistakes' | 'vocabulary' | 'history' | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [scenarioOptions, setScenarioOptions] = useState<Scenario[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(false);
  const [customScenario, setCustomScenario] = useState('');
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [drillQuestions, setDrillQuestions] = useState<DrillQ[]>([]);
  const [drillIndex, setDrillIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [drillScore, setDrillScore] = useState(0);
  const [drillLoading, setDrillLoading] = useState(false);

  const [rewriteSentence, setRewriteSentence] = useState('');
  const [userRewrite, setUserRewrite] = useState('');

  useEffect(() => {
    fetch('/api/history').then((r) => r.json()).then(setHistory).catch(() => { });
    fetch('/api/mistakes').then((r) => r.json()).then(setMistakes).catch(() => { });
    fetch('/api/vocabulary').then((r) => r.json()).then(setVocab).catch(() => { });
    fetch('/api/progress').then((r) => r.json()).then(setProgress).catch(() => { });
    fetch('/api/streak').then((r) => r.json()).then(setStreak).catch(() => { });
  }, [result]);

  useEffect(() => {
    loadScenarios();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetchPrompts('write').then((list) => { setWritePrompts(list); if (list[0]) setPrompt(list[0]); });
    fetchPrompts('speak').then((list) => setSpeakPrompts(list));
    fetchPrompts('rewrite').then((list) => { setRewriteSentences(list); if (list[0]) setRewriteSentence(list[0]); });
  }, []);

  async function newPrompt() {
    setPromptLoading(true);
    const type = mode === 'write' ? 'write' : 'speak';
    const list = await fetchPrompts(type);
    if (list.length > 0) {
      if (type === 'write') setWritePrompts(list);
      else setSpeakPrompts(list);
      setPrompt(list[Math.floor(Math.random() * list.length)]);
    }
    setPromptLoading(false);
  }

  function switchMode(next: 'write' | 'speak' | 'talk' | 'drill' | 'rewrite') {
    setMode(next);
    setResult(null);
    setError('');
    setAudioBlob(null);
    setAudioUrl(null);
    setScenario(null);
    setMessages([]);
    setDrillQuestions([]);
    setDrillIndex(0);
    setSelectedOption(null);
    setUserRewrite('');
    if (next === 'write' && writePrompts.length > 0) setPrompt(writePrompts[0]);
    if (next === 'speak' && speakPrompts.length > 0) setPrompt(speakPrompts[0]);
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

  async function loadScenarios() {
    setScenariosLoading(true);
    try {
      const res = await fetch('/api/scenario-suggestions');
      const data = await res.json();
      if (Array.isArray(data)) setScenarioOptions(data);
    } catch {
      // ignore, grid will just stay empty and user can still type a custom scenario
    } finally {
      setScenariosLoading(false);
    }
  }

  function startScenario(s: Scenario) {
    setScenario(s);
    setMessages([]);
    setResult(null);
    setError('');
  }

  function startCustomScenario() {
    if (!customScenario.trim()) return;
    startScenario({
      label: customScenario.length > 30 ? customScenario.slice(0, 30) + '…' : customScenario,
      icon: '🎭',
      persona: `You are roleplaying in this scenario: ${customScenario}. Stay in character, respond naturally and appropriately for the situation.`,
    });
    setCustomScenario('');
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
        body: JSON.stringify({ persona: scenario.persona, messages: updated }),
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
    if (!scenario) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/roleplay-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioLabel: scenario.label, messages }),
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

  async function startDrill() {
    setDrillLoading(true);
    setDrillQuestions([]);
    setDrillIndex(0);
    setSelectedOption(null);
    setDrillScore(0);
    try {
      const res = await fetch('/api/tense-drill');
      const data = await res.json();
      if (Array.isArray(data)) setDrillQuestions(data);
      else setError('Could not generate a drill — try again.');
    } catch {
      setError('Could not reach the server — check your connection.');
    } finally {
      setDrillLoading(false);
    }
  }

  function selectAnswer(i: number) {
    if (selectedOption !== null) return;
    setSelectedOption(i);
    if (i === drillQuestions[drillIndex].correctIndex) setDrillScore((s) => s + 1);
  }

  function nextQuestion() {
    setSelectedOption(null);
    setDrillIndex((i) => i + 1);
  }

  async function newRewriteSentence() {
    setPromptLoading(true);
    const list = await fetchPrompts('rewrite');
    if (list.length > 0) {
      setRewriteSentences(list);
      setRewriteSentence(list[Math.floor(Math.random() * list.length)]);
    }
    setUserRewrite('');
    setResult(null);
    setPromptLoading(false);
  }

  async function submitRewrite() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/rewrite-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original: rewriteSentence, userRewrite }),
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

  async function fetchPrompts(type: 'write' | 'speak' | 'rewrite'): Promise<string[]> {
    try {
      const res = await fetch(`/api/prompt-suggestions?type=${type}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
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
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display font-bold text-4xl text-[#1E1B2E] tracking-tight">Show up. Speak up.</h1>
          {streak && streak.streak > 0 && (
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 rounded-full px-3.5 py-1.5">
              <span className="text-base">🔥</span>
              <span className="font-display font-bold text-[15px] text-orange-600">{streak.streak}</span>
              <span className="font-mono text-[9.5px] uppercase text-orange-500">day{streak.streak !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <p className="text-[15px] text-[#6B6478] mb-6">
          Write, speak, or talk it out. I'll light up what's working and fix what's not.
        </p>

        <div className="flex gap-2 mb-7 flex-wrap">
          {(['write', 'speak', 'talk', 'drill', 'rewrite'] as const).map((m) => (
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
              <button onClick={newPrompt} disabled={promptLoading} className="font-mono text-[11px] text-violet-600 hover:text-violet-800 mt-3 cursor-pointer transition-colors inline-flex items-center gap-1 disabled:opacity-40">
                {promptLoading ? '✦ thinking…' : '↻ shuffle prompt'}
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
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mono text-[10px] tracking-widest uppercase text-violet-500">Pick a scenario</p>
                  <button
                    onClick={loadScenarios}
                    disabled={scenariosLoading}
                    className="font-mono text-[10px] text-violet-500 hover:text-violet-700 cursor-pointer disabled:opacity-40"
                  >
                    {scenariosLoading ? 'thinking…' : '🔀 new scenarios'}
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                  {scenarioOptions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => startScenario(s)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 hover:border-violet-300 hover:scale-[1.05] transition-all cursor-pointer"
                    >
                      <span className="text-xl">{s.icon}</span>
                      <span className="font-sans text-[11px] text-[#1E1B2E] text-center leading-tight">{s.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={customScenario}
                    onChange={(e) => setCustomScenario(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && startCustomScenario()}
                    placeholder="...or describe your own scenario"
                    className="flex-1 bg-white/60 rounded-full border border-violet-100 px-4 py-2.5 font-sans text-[13px] text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <button
                    onClick={startCustomScenario}
                    disabled={!customScenario.trim()}
                    className="font-mono text-xs uppercase px-4 py-2.5 rounded-full cursor-pointer bg-violet-600 text-white disabled:opacity-40"
                  >
                    Go
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-violet-500">
                    {scenario.icon} {scenario.label}
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

        {mode === 'drill' && (
          <div className="mb-4">
            {drillQuestions.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-sans text-[14px] text-[#6B6478] mb-5">
                  Five questions, built around the tense mistakes you actually make.
                </p>
                <button
                  onClick={startDrill}
                  disabled={drillLoading}
                  className="font-mono text-xs tracking-wider uppercase text-white px-7 py-3.5 rounded-full cursor-pointer
                             bg-gradient-to-r from-violet-600 to-fuchsia-500 disabled:opacity-40
                             shadow-lg shadow-violet-500/30 hover:scale-[1.03] transition-all duration-200"
                >
                  {drillLoading ? 'Building your drill…' : 'Start drill'}
                </button>
              </div>
            ) : drillIndex >= drillQuestions.length ? (
              <div className="text-center py-8 animate-[fade-slide-up_0.4s_ease-out]">
                <p className="font-display font-bold text-3xl text-violet-600 mb-2">
                  {drillScore} / {drillQuestions.length}
                </p>
                <p className="font-sans text-[14px] text-[#6B6478] mb-5">Nice work — want another round?</p>
                <button
                  onClick={startDrill}
                  className="font-mono text-xs uppercase px-6 py-3 rounded-full cursor-pointer bg-violet-600 text-white"
                >
                  New drill
                </button>
              </div>
            ) : (
              <div className="animate-[fade-slide-up_0.3s_ease-out]">
                <p className="font-mono text-[10px] tracking-widest uppercase text-violet-500 mb-2">
                  Question {drillIndex + 1} of {drillQuestions.length}
                </p>
                <p className="font-display text-xl text-[#1E1B2E] mb-5">
                  {drillQuestions[drillIndex].sentence}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                  {drillQuestions[drillIndex].options.map((opt, i) => {
                    const q = drillQuestions[drillIndex];
                    const isCorrect = i === q.correctIndex;
                    const isPicked = i === selectedOption;
                    let style = 'bg-white/60 border-violet-100 hover:border-violet-300';
                    if (selectedOption !== null) {
                      if (isCorrect) style = 'bg-emerald-50 border-emerald-400';
                      else if (isPicked) style = 'bg-rose-50 border-rose-300';
                      else style = 'bg-white/40 border-violet-50 opacity-60';
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => selectAnswer(i)}
                        disabled={selectedOption !== null}
                        className={`font-sans text-[14px] text-[#1E1B2E] text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${style}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {selectedOption !== null && (
                  <div className="animate-[fade-slide-up_0.3s_ease-out]">
                    <p className="font-sans text-[13.5px] text-[#6B6478] mb-4">
                      {drillQuestions[drillIndex].explanation}
                    </p>
                    <button
                      onClick={nextQuestion}
                      className="font-mono text-xs uppercase px-6 py-3 rounded-full cursor-pointer bg-violet-600 text-white"
                    >
                      {drillIndex + 1 === drillQuestions.length ? 'See results' : 'Next question'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'rewrite' && (
          <div className="mb-4">
            <div className="relative bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-2xl p-5 mb-5 border border-violet-100">
              <p className="font-mono text-[10px] tracking-widest uppercase text-violet-500">Make this professional</p>
              <p className="font-display text-lg text-[#1E1B2E] mt-1.5 italic">"{rewriteSentence}"</p>
              <button onClick={newRewriteSentence} className="font-mono text-[11px] text-violet-600 hover:text-violet-800 mt-3 cursor-pointer inline-flex items-center gap-1">
                ↻ new sentence
              </button>
            </div>

            <textarea
              value={userRewrite}
              onChange={(e) => setUserRewrite(e.target.value)}
              placeholder="Your professional rewrite..."
              className="w-full min-h-[100px] bg-white/60 rounded-2xl border border-violet-100 p-4 font-sans text-[16px] leading-relaxed text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-violet-400 resize-y"
            />

            <div className="flex justify-end mt-5">
              <button
                onClick={submitRewrite}
                disabled={loading || !userRewrite.trim()}
                className="font-mono text-xs tracking-wider uppercase text-white px-7 py-3.5 rounded-full cursor-pointer
                           bg-gradient-to-r from-violet-600 to-fuchsia-500 disabled:opacity-40
                           shadow-lg shadow-violet-500/30 hover:scale-[1.03] transition-all duration-200"
              >
                {loading ? 'Comparing…' : 'Compare my rewrite'}
              </button>
            </div>
          </div>
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
                <p className="font-sans text-[16px] leading-relaxed text-[#1E1B2E] bg-violet-50/60 border border-violet-100 rounded-2xl p-5 mb-6">
                  {result.transcript}
                </p>
              </>
            )}

            {(result.fillerWordCount !== undefined || result.scores?.pronunciation !== undefined) && (
              <div className="flex flex-wrap gap-3 mb-6">
                {result.scores?.pronunciation !== undefined && (
                  <div className="flex items-center gap-2 bg-white/60 border border-violet-100 rounded-full px-4 py-2">
                    <span className="text-base">🗣️</span>
                    <span className="font-display font-bold text-[15px] text-violet-600">{result.scores.pronunciation}</span>
                    <span className="font-mono text-[9.5px] uppercase text-[#6B6478]">pronunciation</span>
                  </div>
                )}
                {result.fillerWordCount !== undefined && (
                  <div className="flex items-center gap-2 bg-white/60 border border-violet-100 rounded-full px-4 py-2">
                    <span className="text-base">💬</span>
                    <span className="font-display font-bold text-[15px] text-amber-600">{result.fillerWordCount}</span>
                    <span className="font-mono text-[9.5px] uppercase text-[#6B6478]">
                      filler word{result.fillerWordCount !== 1 ? 's' : ''}
                      {result.fillerWordsFound && result.fillerWordsFound.length > 0 && ` (${result.fillerWordsFound.slice(0, 4).join(', ')})`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {result.pronunciationNotes && (
              <p className="font-sans text-[14px] text-[#6B6478] leading-relaxed mb-6">
                {result.pronunciationNotes}
              </p>
            )}

            <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 mb-3">✦ Cleaner version</p>
            <p className="font-sans text-[16px] leading-relaxed text-[#1E1B2E] bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5 mb-9">
              {result.rewrite}
            </p>

            {result.feedback && (
              <>
                <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 mb-3">✦ How you compared</p>
                <p className="font-sans text-[15px] leading-relaxed text-[#6B6478] bg-violet-50/40 border border-violet-100 rounded-2xl p-5 mb-9">
                  {result.feedback}
                </p>
              </>
            )}

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
          {(['progress', 'mistakes', 'vocabulary', 'history'] as const).map((p) => (
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

        {activePanel === 'progress' && progress.length > 0 && (
          <div className="mt-6">
            <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 mb-4">
              ✦ Your progress over time
            </p>
            <div className="bg-white/60 border border-violet-100 rounded-2xl p-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B6478' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B6478' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #EDE9FE', fontSize: 12 }} />
                  <Line type="monotone" dataKey="overall" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 3 }} name="Overall" />
                  <Line type="monotone" dataKey="grammar" stroke="#059669" strokeWidth={1.5} dot={false} name="Grammar" />
                  <Line type="monotone" dataKey="vocabulary" stroke="#F59E0B" strokeWidth={1.5} dot={false} name="Vocabulary" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {progress.length < 3 && (
              <p className="font-mono text-[10px] text-[#9CA3AF] mt-3">
                Keep practicing daily — the trend gets more meaningful with more days of data.
              </p>
            )}
          </div>
        )}

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
            <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 mb-4">✦ Vocabulary you've upgraded</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {vocab.map((v, i) => (
                <div key={i} className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 hover:border-violet-300 hover:scale-[1.03] transition-all">
                  <p className="font-sans text-[13px] text-rose-400 line-through">{v.original}</p>
                  <p className="font-display font-semibold text-[15px] text-emerald-600 mt-0.5">{v.fixed}</p>
                  {v.count > 1 && <p className="font-mono text-[9.5px] text-violet-400 mt-2">used {v.count}×</p>}
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