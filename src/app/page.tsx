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
type ListenQ = { question: string; options: string[]; correctIndex: number; explanation: string };

const RING_COLORS: Record<string, string> = {
  overall: '#7C3AED',
  grammar: '#059669',
  tense: '#0EA5E9',
  vocabulary: '#F59E0B',
  clarity: '#EC4899',
  natural: '#6366F1',
};

const MODES = ['write', 'speak', 'talk', 'drill', 'idiom', 'rewrite', 'live', 'listen'] as const;
type Mode = typeof MODES[number];

function ScoreRing({ label, value, color, delay = 0 }: { label: string; value: number; color: string; delay?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDisplay(value), 150 + delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (display / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[60px] h-[60px] sm:w-[72px] sm:h-[72px]">
        <svg width="100%" height="100%" viewBox="0 0 72 72" className="-rotate-90 absolute inset-0">
          <circle cx="36" cy="36" r={r} stroke="rgba(30,27,46,0.08)" strokeWidth="6" fill="none" className="dark:stroke-violet-100/10" />
          <circle
            cx="36" cy="36" r={r} stroke={color} strokeWidth="6" fill="none"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-display font-bold text-[13px] sm:text-[15px] text-[#1E1B2E] dark:text-violet-50">
          {display}
        </div>
      </div>
      <span className="font-mono text-[8.5px] sm:text-[9.5px] tracking-wider uppercase text-[#6B6478] dark:text-violet-300/70">{label}</span>
    </div>
  );
}

function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function pcmBase64ToAudioBuffer(ctx: AudioContext, base64Data: string): AudioBuffer {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;
  const buffer = ctx.createBuffer(1, float32.length, 24000);
  buffer.copyToChannel(float32, 0);
  return buffer;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('write');
  const [prompt, setPrompt] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') setDarkMode(true);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const [writePrompts, setWritePrompts] = useState<string[]>([]);
  const [speakPrompts, setSpeakPrompts] = useState<string[]>([]);
  const [promptLoading, setPromptLoading] = useState(false);

  const [history, setHistory] = useState<any[]>([]);
  const [mistakes, setMistakes] = useState<{ tag: string; count: number }[]>([]);
  const [vocab, setVocab] = useState<{ original: string; fixed: string; count: number }[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [streak, setStreak] = useState<{ streak: number; practicedToday: boolean } | null>(null);
  const [achievements, setAchievements] = useState<{ badges: any[]; stats: any } | null>(null);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [weeklyGoal, setWeeklyGoal] = useState(5);
  const [activePanel, setActivePanel] = useState<'goals' | 'progress' | 'mistakes' | 'vocabulary' | 'history' | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('weeklyGoal');
    if (saved) setWeeklyGoal(parseInt(saved, 10));
  }, []);
  function updateWeeklyGoal(n: number) {
    setWeeklyGoal(n);
    localStorage.setItem('weeklyGoal', String(n));
  }

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

  const [idiomQuestions, setIdiomQuestions] = useState<DrillQ[]>([]);
  const [idiomIndex, setIdiomIndex] = useState(0);
  const [idiomSelected, setIdiomSelected] = useState<number | null>(null);
  const [idiomScore, setIdiomScore] = useState(0);
  const [idiomLoading, setIdiomLoading] = useState(false);

  const [rewriteSentences, setRewriteSentences] = useState<string[]>([]);
  const [rewriteSentence, setRewriteSentence] = useState('');
  const [userRewrite, setUserRewrite] = useState('');

  const [liveActive, setLiveActive] = useState(false);
  const sessionRef = useRef<any>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);

  const [passage, setPassage] = useState('');
  const [listenQuestions, setListenQuestions] = useState<ListenQ[]>([]);
  const [listenLoading, setListenLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [listenIndex, setListenIndex] = useState(0);
  const [listenSelected, setListenSelected] = useState<number | null>(null);
  const [listenScore, setListenScore] = useState(0);

  useEffect(() => {
    fetch('/api/history').then((r) => r.json()).then(setHistory).catch(() => {});
    fetch('/api/mistakes').then((r) => r.json()).then(setMistakes).catch(() => {});
    fetch('/api/vocabulary').then((r) => r.json()).then(setVocab).catch(() => {});
    fetch('/api/progress').then((r) => r.json()).then(setProgress).catch(() => {});
    fetch('/api/streak').then((r) => r.json()).then(setStreak).catch(() => {});
    fetch('/api/achievements').then((r) => r.json()).then(setAchievements).catch(() => {});
    fetch('/api/weekly-progress').then((r) => r.json()).then((d) => setWeeklyCount(d.count)).catch(() => {});
  }, [result]);

  useEffect(() => {
    loadScenarios();
    fetchPrompts('write').then((list) => { setWritePrompts(list); if (list[0]) setPrompt(list[0]); });
    fetchPrompts('speak').then((list) => setSpeakPrompts(list));
    fetchPrompts('rewrite').then((list) => { setRewriteSentences(list); if (list[0]) setRewriteSentence(list[0]); });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchPrompts(type: 'write' | 'speak' | 'rewrite'): Promise<string[]> {
    try {
      const res = await fetch(`/api/prompt-suggestions?type=${type}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

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

  function switchMode(next: Mode) {
    if (mode === 'live' && liveActive) stopLiveSession();
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
    setIdiomQuestions([]);
    setIdiomIndex(0);
    setIdiomSelected(null);
    setUserRewrite('');
    setPassage('');
    setListenQuestions([]);
    setListenIndex(0);
    setListenSelected(null);
    setHasPlayed(false);
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

  async function startIdiomDrill() {
    setIdiomLoading(true);
    setIdiomQuestions([]);
    setIdiomIndex(0);
    setIdiomSelected(null);
    setIdiomScore(0);
    try {
      const res = await fetch('/api/idiom-drill');
      const data = await res.json();
      if (Array.isArray(data)) setIdiomQuestions(data);
      else setError('Could not generate a drill — try again.');
    } catch {
      setError('Could not reach the server — check your connection.');
    } finally {
      setIdiomLoading(false);
    }
  }
  function selectIdiomAnswer(i: number) {
    if (idiomSelected !== null) return;
    setIdiomSelected(i);
    if (i === idiomQuestions[idiomIndex].correctIndex) setIdiomScore((s) => s + 1);
  }
  function nextIdiomQuestion() {
    setIdiomSelected(null);
    setIdiomIndex((i) => i + 1);
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

  function playAudioChunk(base64Data: string) {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
      nextPlayTimeRef.current = playbackContextRef.current.currentTime;
    }
    const ctx = playbackContextRef.current;
    const audioBuffer = pcmBase64ToAudioBuffer(ctx, base64Data);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + audioBuffer.duration;
  }
  function clearPlaybackQueue() {
    if (playbackContextRef.current) nextPlayTimeRef.current = playbackContextRef.current.currentTime;
  }

  async function startLiveSession() {
    try {
      const tokenRes = await fetch('/api/live-token', { method: 'POST' });
      const { token, error: tokenError } = await tokenRes.json();
      if (tokenError || !token) throw new Error(tokenError || 'No token returned');

      const { GoogleGenAI, Modality } = await import('@google/genai');
      const liveClient = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } });

      const session = await liveClient.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction:
            "You are Maya, an English speaking conversation partner and tutor for a non-native speaker. You are NOT a general assistant — never ask 'how can I help you' or offer to help with tasks. Instead, have a natural, warm spoken conversation about everyday life. Ask one engaging question at a time and react naturally. IMPORTANT: Every time the learner makes a grammar, tense, or word-choice mistake, briefly and kindly correct it before continuing, proactively, without being asked. Keep replies short, 1-3 sentences. STRICT RULE: Never discuss or entertain immoral, illegal, sexual, violent, or otherwise inappropriate topics, even if the learner brings them up — gently redirect to a wholesome topic instead.",
        },
        callbacks: {
          onopen: () => console.log('✅ Live session open'),
          onerror: (e: any) => { console.error('❌ Live error:', e); setLiveActive(false); },
          onclose: (e: any) => { console.warn('⚠️ Live closed:', e?.reason); setLiveActive(false); },
          onmessage: (msg: any) => {
            const parts = msg?.serverContent?.modelTurn?.parts || [];
            for (const part of parts) if (part.inlineData?.data) playAudioChunk(part.inlineData.data);
            if (msg?.serverContent?.interrupted) clearPlaybackQueue();
          },
        },
      });
      sessionRef.current = session;

      session.sendClientContent({
        turns: [{ role: 'user', parts: [{ text: '(The learner has just joined. Greet them warmly and ask an interesting opening question to start the conversation.)' }] }],
        turnComplete: true,
      });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const micCtx = new AudioContext({ sampleRate: 16000 });
      micContextRef.current = micCtx;
      const source = micCtx.createMediaStreamSource(stream);
      const processor = micCtx.createScriptProcessor(4096, 1, 1);
      micProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const pcm = floatTo16BitPCM(input);
        const base64 = arrayBufferToBase64(pcm);
        sessionRef.current?.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
      };
      source.connect(processor);
      processor.connect(micCtx.destination);
      setLiveActive(true);
    } catch (err) {
      console.error(err);
      setError('Could not start live session — check console for details.');
    }
  }

  function stopLiveSession() {
    micProcessorRef.current?.disconnect();
    micContextRef.current?.close();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    sessionRef.current?.close();
    playbackContextRef.current?.close();
    playbackContextRef.current = null;
    sessionRef.current = null;
    setLiveActive(false);
  }

  async function startListening() {
    setListenLoading(true);
    setPassage('');
    setListenQuestions([]);
    setListenIndex(0);
    setListenSelected(null);
    setListenScore(0);
    setHasPlayed(false);
    try {
      const res = await fetch('/api/listening-passage');
      const data = await res.json();
      if (data.passage) {
        setPassage(data.passage);
        setListenQuestions(data.questions || []);
      } else setError('Could not generate a passage — try again.');
    } catch {
      setError('Could not reach the server — check your connection.');
    } finally {
      setListenLoading(false);
    }
  }

  async function playPassage() {
    setAudioLoading(true);
    try {
      const res = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: passage }),
      });
      const data = await res.json();
      if (!data.audio) throw new Error('No audio');
      const ctx = new AudioContext({ sampleRate: 24000 });
      const buffer = pcmBase64ToAudioBuffer(ctx, data.audio);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      setHasPlayed(true);
    } catch {
      setError('Could not play the audio — try again.');
    } finally {
      setAudioLoading(false);
    }
  }
  function selectListenAnswer(i: number) {
    if (listenSelected !== null) return;
    setListenSelected(i);
    if (i === listenQuestions[listenIndex].correctIndex) setListenScore((s) => s + 1);
  }
  function nextListenQuestion() {
    setListenSelected(null);
    setListenIndex((i) => i + 1);
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#EEF2FF] via-[#F5F3FF] to-[#FDF4FF] dark:from-[#0F0B1E] dark:via-[#150F26] dark:to-[#1A1229] flex justify-center py-6 sm:py-14 px-3 sm:px-4">
      <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 rounded-full bg-violet-300/40 dark:bg-violet-700/20 blur-3xl animate-[blob-float_20s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-[28rem] h-[28rem] rounded-full bg-fuchsia-300/30 dark:bg-fuchsia-700/15 blur-3xl animate-[blob-float_24s_ease-in-out_infinite_reverse]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-amber-200/30 dark:bg-amber-700/10 blur-3xl animate-[blob-float_17s_ease-in-out_infinite]" />

      <div className="relative w-full max-w-2xl bg-white/70 dark:bg-[#1A1530]/80 backdrop-blur-xl rounded-2xl sm:rounded-[28px] shadow-[0_20px_60px_-15px_rgba(76,29,149,0.35)] border border-white/60 dark:border-violet-900/40 px-5 py-6 sm:px-14 sm:py-12">
        <p className="font-mono text-[10px] sm:text-[11px] tracking-widest uppercase text-violet-500 dark:text-violet-400 mb-2">
          ✦ Marginal · Daily Practice
        </p>
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <h1 className="font-display font-bold text-2xl sm:text-4xl text-[#1E1B2E] dark:text-white tracking-tight">Show up. Speak up.</h1>
          <div className="flex items-center gap-2">
            {streak && streak.streak > 0 && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200 dark:border-amber-800/40 rounded-full px-3 py-1 sm:px-3.5 sm:py-1.5">
                <span className="text-sm sm:text-base">🔥</span>
                <span className="font-display font-bold text-[13px] sm:text-[15px] text-orange-600 dark:text-orange-300">{streak.streak}</span>
                <span className="font-mono text-[8.5px] sm:text-[9.5px] uppercase text-orange-500 dark:text-orange-400">day{streak.streak !== 1 ? 's' : ''}</span>
              </div>
            )}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-900/40 flex items-center justify-center cursor-pointer flex-shrink-0"
            >
              <span className="text-sm">{darkMode ? '☀️' : '🌙'}</span>
            </button>
          </div>
        </div>
        <p className="text-[13.5px] sm:text-[15px] text-[#6B6478] dark:text-violet-300/70 mb-5 sm:mb-6">
          Write, speak, or talk it out. I'll light up what's working and fix what's not.
        </p>

        <div className="flex gap-1.5 sm:gap-2 mb-6 sm:mb-7 flex-wrap">
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`font-mono text-[10px] sm:text-xs uppercase px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-colors cursor-pointer ${
                mode === m ? 'bg-violet-600 text-white' : 'bg-violet-50 dark:bg-violet-900/30 text-violet-500 dark:text-violet-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === 'write' && (
          <>
            <div className="relative bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 rounded-2xl p-4 sm:p-5 mb-5 sm:mb-7 border border-violet-100 dark:border-violet-800/40">
              <p className="font-mono text-[10px] tracking-widest uppercase text-violet-500 dark:text-violet-400">Prompt</p>
              <p className="font-display text-base sm:text-lg text-[#1E1B2E] dark:text-violet-50 mt-1.5 leading-snug">{prompt}</p>
              <button onClick={newPrompt} disabled={promptLoading} className="font-mono text-[11px] text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-100 mt-3 cursor-pointer transition-colors inline-flex items-center gap-1 disabled:opacity-40">
                {promptLoading ? '✦ thinking…' : '↻ shuffle prompt'}
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start writing here..."
              className="w-full min-h-[120px] sm:min-h-[140px] bg-white/60 dark:bg-black/20 rounded-2xl border border-violet-100 dark:border-violet-800/40 p-3.5 sm:p-4 font-sans text-[15px] sm:text-[16px] leading-relaxed text-[#1E1B2E] dark:text-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-y transition-shadow"
            />
            <div className="flex justify-end mt-4 sm:mt-5">
              <button
                onClick={handleSubmit}
                disabled={loading || !text.trim()}
                className="relative font-mono text-xs tracking-wider uppercase text-white px-5 sm:px-7 py-3 sm:py-3.5 rounded-full cursor-pointer w-full sm:w-auto
                           bg-gradient-to-r from-violet-600 to-fuchsia-500 disabled:opacity-40 disabled:cursor-default
                           shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.03] active:scale-[0.98]
                           transition-all duration-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
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
            <div className="relative bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 rounded-2xl p-4 sm:p-5 mb-5 sm:mb-7 border border-violet-100 dark:border-violet-800/40">
              <p className="font-mono text-[10px] tracking-widest uppercase text-violet-500 dark:text-violet-400">Speaking topic</p>
              <p className="font-display text-base sm:text-lg text-[#1E1B2E] dark:text-violet-50 mt-1.5 leading-snug">{prompt}</p>
              <button onClick={newPrompt} disabled={promptLoading} className="font-mono text-[11px] text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-100 mt-3 cursor-pointer transition-colors inline-flex items-center gap-1 disabled:opacity-40">
                {promptLoading ? '✦ thinking…' : '↻ shuffle topic'}
              </button>
            </div>
            <div className="mb-2">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`font-mono text-xs uppercase px-5 sm:px-6 py-3 sm:py-3.5 rounded-full cursor-pointer transition-all
                    ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-gradient-to-r from-violet-600 to-fuchsia-500'} text-white`}
                >
                  {isRecording ? '● Stop recording' : '🎤 Start recording'}
                </button>
                {audioUrl && <audio src={audioUrl} controls className="h-9 max-w-full" />}
              </div>
              {audioUrl && (
                <div className="flex justify-end mt-5">
                  <button
                    onClick={handleSpeakSubmit}
                    disabled={loading}
                    className="font-mono text-xs tracking-wider uppercase text-white px-5 sm:px-7 py-3 sm:py-3.5 rounded-full cursor-pointer w-full sm:w-auto
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
                  <p className="font-mono text-[10px] tracking-widest uppercase text-violet-500 dark:text-violet-400">Pick a scenario</p>
                  <button
                    onClick={loadScenarios}
                    disabled={scenariosLoading}
                    className="font-mono text-[10px] text-violet-500 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-200 cursor-pointer disabled:opacity-40"
                  >
                    {scenariosLoading ? 'thinking…' : '🔀 new scenarios'}
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                  {scenarioOptions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => startScenario(s)}
                      className="flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 border border-violet-100 dark:border-violet-800/40 hover:border-violet-300 dark:hover:border-violet-600 hover:scale-[1.05] transition-all cursor-pointer"
                    >
                      <span className="text-lg sm:text-xl">{s.icon}</span>
                      <span className="font-sans text-[10px] sm:text-[11px] text-[#1E1B2E] dark:text-violet-50 text-center leading-tight">{s.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={customScenario}
                    onChange={(e) => setCustomScenario(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && startCustomScenario()}
                    placeholder="...or describe your own scenario"
                    className="flex-1 min-w-0 bg-white/60 dark:bg-black/20 rounded-full border border-violet-100 dark:border-violet-800/40 px-4 py-2.5 font-sans text-[13px] text-[#1E1B2E] dark:text-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <button
                    onClick={startCustomScenario}
                    disabled={!customScenario.trim()}
                    className="font-mono text-xs uppercase px-4 py-2.5 rounded-full cursor-pointer bg-violet-600 text-white disabled:opacity-40 flex-shrink-0"
                  >
                    Go
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-violet-500 dark:text-violet-400 truncate">
                    {scenario.icon} {scenario.label}
                  </span>
                  <button
                    onClick={() => { setScenario(null); setMessages([]); }}
                    className="font-mono text-[10px] text-violet-400 dark:text-violet-500 hover:text-violet-600 dark:hover:text-violet-300 cursor-pointer flex-shrink-0"
                  >
                    change scenario
                  </button>
                </div>

                <div className="bg-white/60 dark:bg-black/20 border border-violet-100 dark:border-violet-800/40 rounded-2xl p-3 sm:p-4 h-64 sm:h-72 overflow-y-auto mb-3 flex flex-col gap-3">
                  {messages.length === 0 && (
                    <p className="font-sans text-[13px] sm:text-[13.5px] text-[#9CA3AF] dark:text-violet-400/50 italic m-auto text-center px-4">
                      Say hello to start the conversation.
                    </p>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] sm:max-w-[80%] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-[13.5px] sm:text-[14px] font-sans leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-br-sm'
                            : 'bg-violet-50 dark:bg-violet-900/30 text-[#1E1B2E] dark:text-violet-50 rounded-bl-sm'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-violet-50 dark:bg-violet-900/30 px-4 py-2.5 rounded-2xl rounded-bl-sm">
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
                    className="flex-1 min-w-0 bg-white/60 dark:bg-black/20 rounded-full border border-violet-100 dark:border-violet-800/40 px-4 py-2.5 font-sans text-[14px] text-[#1E1B2E] dark:text-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={chatLoading || !chatInput.trim()}
                    className="font-mono text-xs uppercase px-4 sm:px-5 py-2.5 rounded-full cursor-pointer bg-violet-600 text-white disabled:opacity-40 flex-shrink-0"
                  >
                    Send
                  </button>
                </div>

                {messages.filter((m) => m.role === 'user').length >= 2 && (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={endConversation}
                      disabled={loading}
                      className="font-mono text-xs tracking-wider uppercase text-white px-5 sm:px-7 py-3 sm:py-3.5 rounded-full cursor-pointer w-full sm:w-auto
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
                <p className="font-sans text-[14px] text-[#6B6478] dark:text-violet-300/70 mb-5">
                  Five questions, built around the tense mistakes you actually make.
                </p>
                <button onClick={startDrill} disabled={drillLoading} className="font-mono text-xs tracking-wider uppercase text-white px-6 sm:px-7 py-3 sm:py-3.5 rounded-full cursor-pointer bg-gradient-to-r from-violet-600 to-fuchsia-500 disabled:opacity-40 shadow-lg shadow-violet-500/30 hover:scale-[1.03] transition-all duration-200">
                  {drillLoading ? 'Building your drill…' : 'Start drill'}
                </button>
              </div>
            ) : drillIndex >= drillQuestions.length ? (
              <div className="text-center py-8 animate-[fade-slide-up_0.4s_ease-out]">
                <p className="font-display font-bold text-3xl text-violet-600 dark:text-violet-400 mb-2">{drillScore} / {drillQuestions.length}</p>
                <p className="font-sans text-[14px] text-[#6B6478] dark:text-violet-300/70 mb-5">Nice work — want another round?</p>
                <button onClick={startDrill} className="font-mono text-xs uppercase px-6 py-3 rounded-full cursor-pointer bg-violet-600 text-white">New drill</button>
              </div>
            ) : (
              <div className="animate-[fade-slide-up_0.3s_ease-out]">
                <p className="font-mono text-[10px] tracking-widest uppercase text-violet-500 dark:text-violet-400 mb-2">Question {drillIndex + 1} of {drillQuestions.length}</p>
                <p className="font-display text-lg sm:text-xl text-[#1E1B2E] dark:text-violet-50 mb-5 leading-snug">{drillQuestions[drillIndex].sentence}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                  {drillQuestions[drillIndex].options.map((opt, i) => {
                    const q = drillQuestions[drillIndex];
                    const isCorrect = i === q.correctIndex;
                    const isPicked = i === selectedOption;
                    let style = 'bg-white/60 dark:bg-black/20 border-violet-100 dark:border-violet-800/40 hover:border-violet-300 dark:hover:border-violet-600';
                    if (selectedOption !== null) {
                      if (isCorrect) style = 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400';
                      else if (isPicked) style = 'bg-rose-50 dark:bg-rose-900/20 border-rose-300';
                      else style = 'bg-white/40 dark:bg-black/10 border-violet-50 dark:border-violet-900/30 opacity-60';
                    }
                    return (
                      <button key={i} onClick={() => selectAnswer(i)} disabled={selectedOption !== null} className={`font-sans text-[14px] text-[#1E1B2E] dark:text-violet-50 text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${style}`}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {selectedOption !== null && (
                  <div className="animate-[fade-slide-up_0.3s_ease-out]">
                    <p className="font-sans text-[13.5px] text-[#6B6478] dark:text-violet-300/70 mb-4">{drillQuestions[drillIndex].explanation}</p>
                    <button onClick={nextQuestion} className="font-mono text-xs uppercase px-6 py-3 rounded-full cursor-pointer bg-violet-600 text-white">
                      {drillIndex + 1 === drillQuestions.length ? 'See results' : 'Next question'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'idiom' && (
          <div className="mb-4">
            {idiomQuestions.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-sans text-[14px] text-[#6B6478] dark:text-violet-300/70 mb-5">Five questions on idioms and expressions native speakers use every day.</p>
                <button onClick={startIdiomDrill} disabled={idiomLoading} className="font-mono text-xs tracking-wider uppercase text-white px-7 py-3.5 rounded-full cursor-pointer bg-gradient-to-r from-violet-600 to-fuchsia-500 disabled:opacity-40 shadow-lg shadow-violet-500/30 hover:scale-[1.03] transition-all duration-200">
                  {idiomLoading ? 'Building your drill…' : 'Start drill'}
                </button>
              </div>
            ) : idiomIndex >= idiomQuestions.length ? (
              <div className="text-center py-8 animate-[fade-slide-up_0.4s_ease-out]">
                <p className="font-display font-bold text-3xl text-violet-600 dark:text-violet-400 mb-2">{idiomScore} / {idiomQuestions.length}</p>
                <p className="font-sans text-[14px] text-[#6B6478] dark:text-violet-300/70 mb-5">Nice work — want another round?</p>
                <button onClick={startIdiomDrill} className="font-mono text-xs uppercase px-6 py-3 rounded-full cursor-pointer bg-violet-600 text-white">New drill</button>
              </div>
            ) : (
              <div className="animate-[fade-slide-up_0.3s_ease-out]">
                <p className="font-mono text-[10px] tracking-widest uppercase text-violet-500 dark:text-violet-400 mb-2">Question {idiomIndex + 1} of {idiomQuestions.length}</p>
                <p className="font-display text-lg sm:text-xl text-[#1E1B2E] dark:text-violet-50 mb-5 leading-snug">{idiomQuestions[idiomIndex].sentence}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                  {idiomQuestions[idiomIndex].options.map((opt, i) => {
                    const q = idiomQuestions[idiomIndex];
                    const isCorrect = i === q.correctIndex;
                    const isPicked = i === idiomSelected;
                    let style = 'bg-white/60 dark:bg-black/20 border-violet-100 dark:border-violet-800/40 hover:border-violet-300 dark:hover:border-violet-600';
                    if (idiomSelected !== null) {
                      if (isCorrect) style = 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400';
                      else if (isPicked) style = 'bg-rose-50 dark:bg-rose-900/20 border-rose-300';
                      else style = 'bg-white/40 dark:bg-black/10 border-violet-50 dark:border-violet-900/30 opacity-60';
                    }
                    return (
                      <button key={i} onClick={() => selectIdiomAnswer(i)} disabled={idiomSelected !== null} className={`font-sans text-[14px] text-[#1E1B2E] dark:text-violet-50 text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${style}`}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {idiomSelected !== null && (
                  <div className="animate-[fade-slide-up_0.3s_ease-out]">
                    <p className="font-sans text-[13.5px] text-[#6B6478] dark:text-violet-300/70 mb-4">{idiomQuestions[idiomIndex].explanation}</p>
                    <button onClick={nextIdiomQuestion} className="font-mono text-xs uppercase px-6 py-3 rounded-full cursor-pointer bg-violet-600 text-white">
                      {idiomIndex + 1 === idiomQuestions.length ? 'See results' : 'Next question'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'rewrite' && (
          <div className="mb-4">
            <div className="relative bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 rounded-2xl p-4 sm:p-5 mb-5 border border-violet-100 dark:border-violet-800/40">
              <p className="font-mono text-[10px] tracking-widest uppercase text-violet-500 dark:text-violet-400">Make this professional</p>
              <p className="font-display text-base sm:text-lg text-[#1E1B2E] dark:text-violet-50 mt-1.5 italic leading-snug">"{rewriteSentence}"</p>
              <button onClick={newRewriteSentence} disabled={promptLoading} className="font-mono text-[11px] text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-100 mt-3 cursor-pointer inline-flex items-center gap-1 disabled:opacity-40">
                {promptLoading ? '✦ thinking…' : '↻ new sentence'}
              </button>
            </div>
            <textarea
              value={userRewrite}
              onChange={(e) => setUserRewrite(e.target.value)}
              placeholder="Your professional rewrite..."
              className="w-full min-h-[90px] sm:min-h-[100px] bg-white/60 dark:bg-black/20 rounded-2xl border border-violet-100 dark:border-violet-800/40 p-3.5 sm:p-4 font-sans text-[15px] sm:text-[16px] leading-relaxed text-[#1E1B2E] dark:text-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-y"
            />
            <div className="flex justify-end mt-4 sm:mt-5">
              <button onClick={submitRewrite} disabled={loading || !userRewrite.trim()} className="font-mono text-xs tracking-wider uppercase text-white px-5 sm:px-7 py-3 sm:py-3.5 rounded-full cursor-pointer w-full sm:w-auto bg-gradient-to-r from-violet-600 to-fuchsia-500 disabled:opacity-40 shadow-lg shadow-violet-500/30 hover:scale-[1.03] transition-all duration-200">
                {loading ? 'Comparing…' : 'Compare my rewrite'}
              </button>
            </div>
          </div>
        )}

        {mode === 'live' && (
          <div className="text-center py-8">
            <p className="font-sans text-[13.5px] sm:text-[14px] text-[#6B6478] dark:text-violet-300/70 mb-5 px-2">
              {liveActive ? "🎙️ Live — just talk naturally." : "Start a real-time spoken conversation with your AI tutor."}
            </p>
            <button onClick={liveActive ? stopLiveSession : startLiveSession} className={`font-mono text-xs uppercase px-6 sm:px-7 py-3 sm:py-3.5 rounded-full cursor-pointer transition-all ${liveActive ? 'bg-rose-500 animate-pulse text-white' : 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white'}`}>
              {liveActive ? '● End conversation' : 'Start conversation'}
            </button>
          </div>
        )}

        {mode === 'listen' && (
          <div className="mb-4">
            {!passage ? (
              <div className="text-center py-8">
                <p className="font-sans text-[14px] text-[#6B6478] dark:text-violet-300/70 mb-5">Listen to a short passage, then answer questions about it.</p>
                <button onClick={startListening} disabled={listenLoading} className="font-mono text-xs tracking-wider uppercase text-white px-7 py-3.5 rounded-full cursor-pointer bg-gradient-to-r from-violet-600 to-fuchsia-500 disabled:opacity-40 shadow-lg shadow-violet-500/30 hover:scale-[1.03] transition-all duration-200">
                  {listenLoading ? 'Preparing…' : 'Start listening exercise'}
                </button>
              </div>
            ) : listenIndex >= listenQuestions.length && listenQuestions.length > 0 ? (
              <div className="text-center py-8 animate-[fade-slide-up_0.4s_ease-out]">
                <p className="font-display font-bold text-3xl text-violet-600 dark:text-violet-400 mb-2">{listenScore} / {listenQuestions.length}</p>
                <p className="font-sans text-[14px] text-[#6B6478] dark:text-violet-300/70 mb-5">Want another passage?</p>
                <button onClick={startListening} className="font-mono text-xs uppercase px-6 py-3 rounded-full cursor-pointer bg-violet-600 text-white">New passage</button>
              </div>
            ) : !hasPlayed ? (
              <div className="text-center py-8">
                <p className="font-sans text-[13.5px] text-[#6B6478] dark:text-violet-300/70 mb-5">Listen carefully — you can replay it, but try once first.</p>
                <button onClick={playPassage} disabled={audioLoading} className="font-mono text-xs uppercase px-7 py-3.5 rounded-full cursor-pointer bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white disabled:opacity-40">
                  {audioLoading ? 'Loading audio…' : '🔊 Play passage'}
                </button>
              </div>
            ) : (
              <div className="animate-[fade-slide-up_0.3s_ease-out]">
                <div className="flex items-center justify-between mb-5">
                  <p className="font-mono text-[10px] tracking-widest uppercase text-violet-500 dark:text-violet-400">Question {listenIndex + 1} of {listenQuestions.length}</p>
                  <button onClick={playPassage} disabled={audioLoading} className="font-mono text-[10px] text-violet-500 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-200 cursor-pointer">🔊 replay</button>
                </div>
                <p className="font-display text-lg text-[#1E1B2E] dark:text-violet-50 mb-5">{listenQuestions[listenIndex].question}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                  {listenQuestions[listenIndex].options.map((opt, i) => {
                    const q = listenQuestions[listenIndex];
                    const isCorrect = i === q.correctIndex;
                    const isPicked = i === listenSelected;
                    let style = 'bg-white/60 dark:bg-black/20 border-violet-100 dark:border-violet-800/40 hover:border-violet-300 dark:hover:border-violet-600';
                    if (listenSelected !== null) {
                      if (isCorrect) style = 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400';
                      else if (isPicked) style = 'bg-rose-50 dark:bg-rose-900/20 border-rose-300';
                      else style = 'bg-white/40 dark:bg-black/10 border-violet-50 dark:border-violet-900/30 opacity-60';
                    }
                    return (
                      <button key={i} onClick={() => selectListenAnswer(i)} disabled={listenSelected !== null} className={`font-sans text-[14px] text-[#1E1B2E] dark:text-violet-50 text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${style}`}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {listenSelected !== null && (
                  <div className="animate-[fade-slide-up_0.3s_ease-out]">
                    <p className="font-sans text-[13.5px] text-[#6B6478] dark:text-violet-300/70 mb-4">{listenQuestions[listenIndex].explanation}</p>
                    <button onClick={nextListenQuestion} className="font-mono text-xs uppercase px-6 py-3 rounded-full cursor-pointer bg-violet-600 text-white">
                      {listenIndex + 1 === listenQuestions.length ? 'See results' : 'Next question'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {error && <p className="font-mono text-xs text-rose-500 dark:text-rose-400 mt-4 animate-[fade-slide-up_0.3s_ease-out] break-words">{error}</p>}

        {result && (
          <div className="mt-8 sm:mt-10 animate-[fade-slide-up_0.5s_ease-out]">
            <div className="flex gap-2 sm:gap-3 flex-wrap justify-between sm:justify-start sm:gap-6 pb-6 sm:pb-8 mb-6 sm:mb-8 border-b border-violet-100 dark:border-violet-800/40">
              {(['overall', 'grammar', 'tense', 'vocabulary', 'clarity', 'natural'] as const).map((key, i) => (
                <ScoreRing key={key} label={key} value={result.scores[key]} color={RING_COLORS[key]} delay={i * 80} />
              ))}
            </div>

            {result.transcript && (
              <>
                <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 dark:text-violet-400 mb-3">✦ What you said</p>
                <p className="font-sans text-[15px] sm:text-[16px] leading-relaxed text-[#1E1B2E] dark:text-violet-50 bg-violet-50/60 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 rounded-2xl p-4 sm:p-5 mb-6">
                  {result.transcript}
                </p>
              </>
            )}

            {(result.fillerWordCount !== undefined || result.scores?.pronunciation !== undefined) && (
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
                {result.scores?.pronunciation !== undefined && (
                  <div className="flex items-center gap-2 bg-white/60 dark:bg-black/20 border border-violet-100 dark:border-violet-800/40 rounded-full px-3.5 sm:px-4 py-2">
                    <span className="text-base">🗣️</span>
                    <span className="font-display font-bold text-[15px] text-violet-600 dark:text-violet-400">{result.scores.pronunciation}</span>
                    <span className="font-mono text-[9.5px] uppercase text-[#6B6478] dark:text-violet-300/70">pronunciation</span>
                  </div>
                )}
                {result.fillerWordCount !== undefined && (
                  <div className="flex items-center gap-2 bg-white/60 dark:bg-black/20 border border-violet-100 dark:border-violet-800/40 rounded-full px-3.5 sm:px-4 py-2">
                    <span className="text-base">💬</span>
                    <span className="font-display font-bold text-[15px] text-amber-600 dark:text-amber-400">{result.fillerWordCount}</span>
                    <span className="font-mono text-[9.5px] uppercase text-[#6B6478] dark:text-violet-300/70">
                      filler word{result.fillerWordCount !== 1 ? 's' : ''}
                      {result.fillerWordsFound && result.fillerWordsFound.length > 0 && ` (${result.fillerWordsFound.slice(0, 4).join(', ')})`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {result.pronunciationNotes && <p className="font-sans text-[13.5px] sm:text-[14px] text-[#6B6478] dark:text-violet-300/70 leading-relaxed mb-6">{result.pronunciationNotes}</p>}

            <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 dark:text-violet-400 mb-3">✦ Cleaner version</p>
            <p className="font-sans text-[15px] sm:text-[16px] leading-relaxed text-[#1E1B2E] dark:text-violet-50 bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-2xl p-4 sm:p-5 mb-8 sm:mb-9">
              {result.rewrite}
            </p>

            {result.feedback && (
              <>
                <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 dark:text-violet-400 mb-3">✦ How you compared</p>
                <p className="font-sans text-[14px] sm:text-[15px] leading-relaxed text-[#6B6478] dark:text-violet-300/70 bg-violet-50/40 dark:bg-violet-900/15 border border-violet-100 dark:border-violet-800/40 rounded-2xl p-4 sm:p-5 mb-8 sm:mb-9">
                  {result.feedback}
                </p>
              </>
            )}

            <p className="font-mono text-[10px] tracking-widest uppercase text-violet-500 dark:text-violet-400 mb-3">What changed, and why</p>
            <div className="space-y-3">
              {result.corrections.map((c, i) => (
                <div key={i} className="flex gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-black/20 border border-violet-100 dark:border-violet-800/40 hover:border-violet-300 dark:hover:border-violet-600 transition-colors" style={{ animation: `fade-slide-up 0.4s ease-out ${i * 90}ms both` }}>
                  <span className="font-mono text-xs font-bold text-violet-400 dark:text-violet-500 min-w-[20px] pt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <span className="font-sans text-[14px] sm:text-[14.5px] text-rose-400 dark:text-rose-400 line-through">{c.original}</span>
                    <span className="text-[#6B6478] dark:text-violet-300/70 mx-2">→</span>
                    <span className="font-sans text-[14px] sm:text-[14.5px] font-medium text-emerald-600 dark:text-emerald-400">{c.fixed}</span>
                    <p className="text-[13px] sm:text-[13.5px] text-[#6B6478] dark:text-violet-300/70 mt-1.5">{c.why}</p>
                    <span className="inline-block font-mono text-[9.5px] tracking-wide uppercase bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full mt-2">{c.tag}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-1.5 sm:gap-2 mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-violet-100 dark:border-violet-800/40 flex-wrap">
          {(['goals', 'progress', 'mistakes', 'vocabulary', 'history'] as const).map((p) => (
            <button key={p} onClick={() => setActivePanel(activePanel === p ? null : p)} className={`font-mono text-[10px] sm:text-xs uppercase px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-colors cursor-pointer ${activePanel === p ? 'bg-violet-600 text-white' : 'bg-violet-50 dark:bg-violet-900/30 text-violet-500 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50'}`}>
              {p}
            </button>
          ))}
        </div>

        {activePanel === 'goals' && (
          <div className="mt-6">
            <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 dark:text-violet-400 mb-4">✦ This week's goal</p>
            <div className="bg-white/60 dark:bg-black/20 border border-violet-100 dark:border-violet-800/40 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans text-[13px] text-[#1E1B2E] dark:text-violet-50">{weeklyCount} / {weeklyGoal} sessions</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateWeeklyGoal(Math.max(1, weeklyGoal - 1))} className="w-6 h-6 rounded-full bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 font-mono text-xs cursor-pointer">−</button>
                  <button onClick={() => updateWeeklyGoal(weeklyGoal + 1)} className="w-6 h-6 rounded-full bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 font-mono text-xs cursor-pointer">+</button>
                </div>
              </div>
              <div className="h-3 bg-violet-50 dark:bg-violet-900/30 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.min(100, (weeklyCount / weeklyGoal) * 100)}%` }} />
              </div>
              {weeklyCount >= weeklyGoal && <p className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 mt-2">🎉 Goal reached this week!</p>}
            </div>

            <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 dark:text-violet-400 mb-4">✦ Achievements</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {achievements?.badges.map((b) => (
                <div key={b.id} className={`p-3.5 rounded-2xl border text-center transition-all ${b.earned ? 'bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 border-violet-200 dark:border-violet-700/40' : 'bg-white/40 dark:bg-black/10 border-violet-50 dark:border-violet-900/30 opacity-50'}`}>
                  <span className="text-xl block mb-1">{b.icon}</span>
                  <p className="font-sans text-[11px] font-medium text-[#1E1B2E] dark:text-violet-50">{b.label}</p>
                  <p className="font-mono text-[8.5px] text-[#6B6478] dark:text-violet-300/60 mt-1 leading-tight">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activePanel === 'progress' && progress.length > 0 && (
          <div className="mt-6">
            <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 dark:text-violet-400 mb-4">✦ Your progress over time</p>
            <div className="bg-white/60 dark:bg-black/20 border border-violet-100 dark:border-violet-800/40 rounded-2xl p-2 sm:p-4 h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6B6478' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6B6478' }} width={28} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #EDE9FE', fontSize: 12 }} />
                  <Line type="monotone" dataKey="overall" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 3 }} name="Overall" />
                  <Line type="monotone" dataKey="grammar" stroke="#059669" strokeWidth={1.5} dot={false} name="Grammar" />
                  <Line type="monotone" dataKey="vocabulary" stroke="#F59E0B" strokeWidth={1.5} dot={false} name="Vocabulary" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {progress.length < 3 && <p className="font-mono text-[10px] text-[#9CA3AF] dark:text-violet-400/50 mt-3">Keep practicing daily — the trend gets more meaningful with more days of data.</p>}
          </div>
        )}

        {activePanel === 'mistakes' && mistakes.length > 0 && (
          <div className="mt-6">
            <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 dark:text-violet-400 mb-4">✦ Your recurring mistakes</p>
            <div className="space-y-3">
              {mistakes.map((m) => {
                const max = mistakes[0].count;
                const pct = Math.max(8, (m.count / max) * 100);
                return (
                  <div key={m.tag} className="flex items-center gap-2 sm:gap-3">
                    <span className="font-sans text-[12px] sm:text-[13px] text-[#1E1B2E] dark:text-violet-50 w-20 sm:w-28 flex-shrink-0 truncate">{m.tag}</span>
                    <div className="flex-1 h-5 sm:h-6 bg-violet-50 dark:bg-violet-900/30 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 rounded-full flex items-center justify-end pr-2 transition-all duration-700 ease-out" style={{ width: `${pct}%` }}>
                        <span className="font-mono text-[9px] sm:text-[10px] text-white font-bold">{m.count}</span>
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
            <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 dark:text-violet-400 mb-4">✦ Vocabulary you've upgraded</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {vocab.map((v, i) => (
                <div key={i} className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 border border-violet-100 dark:border-violet-800/40 hover:border-violet-300 dark:hover:border-violet-600 hover:scale-[1.03] transition-all">
                  <p className="font-sans text-[12px] sm:text-[13px] text-rose-400 line-through">{v.original}</p>
                  <p className="font-display font-semibold text-[14px] sm:text-[15px] text-emerald-600 dark:text-emerald-400 mt-0.5">{v.fixed}</p>
                  {v.count > 1 && <p className="font-mono text-[9px] sm:text-[9.5px] text-violet-400 dark:text-violet-500 mt-2">used {v.count}×</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activePanel === 'history' && history.length > 0 && (
          <div className="mt-6">
            <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 dark:text-violet-400 mb-4">✦ Your history</p>
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 sm:gap-4 p-3 sm:p-3.5 rounded-xl bg-white/60 dark:bg-black/20 border border-violet-100 dark:border-violet-800/40 hover:border-violet-300 dark:hover:border-violet-600 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-[13px] sm:text-[13.5px] text-[#1E1B2E] dark:text-violet-50 truncate">{entry.text}</p>
                    <p className="font-mono text-[9.5px] sm:text-[10px] text-[#9CA3AF] dark:text-violet-400/50 mt-1">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex-shrink-0 font-display font-bold text-base sm:text-lg text-violet-600 dark:text-violet-400">{entry.scores?.overall ?? '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}