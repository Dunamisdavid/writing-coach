import Link from 'next/link';

const FEATURES = [
  { icon: '✍️', title: 'Write', desc: 'Daily prompts, graded instantly' },
  { icon: '🎤', title: 'Speak', desc: 'Record yourself, get real feedback' },
  { icon: '💬', title: 'Talk', desc: 'Practice real conversations with AI' },
  { icon: '🎙️', title: 'Live tutor', desc: 'A live voice conversation that corrects you as you go' },
  { icon: '🧠', title: 'Drills', desc: 'Tense and idiom practice, tailored to your mistakes' },
  { icon: '📈', title: 'Progress', desc: 'Watch your scores improve over weeks' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#EEF2FF] via-[#F5F3FF] to-[#FDF4FF] dark:from-[#0F0B1E] dark:via-[#150F26] dark:to-[#1A1229]">
      <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 rounded-full bg-violet-300/40 blur-3xl animate-[blob-float_20s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-[28rem] h-[28rem] rounded-full bg-fuchsia-300/30 blur-3xl animate-[blob-float_24s_ease-in-out_infinite_reverse]" />

      <nav className="relative flex items-center justify-between max-w-5xl mx-auto px-6 py-6">
        <div>
          <Logo size="sm" />
          <p className="font-mono text-[8px] tracking-widest uppercase text-violet-400 mt-0.5">Powered by Wisdom Corner</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="font-mono text-xs uppercase text-violet-600 dark:text-violet-300 hover:text-violet-800 cursor-pointer transition-colors">
            Sign in
          </Link>
          <Link href="/sign-up" className="font-mono text-xs uppercase bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-full cursor-pointer transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      <section className="relative max-w-3xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>
        <p className="font-mono text-[11px] tracking-widest uppercase text-violet-500 mb-4">Daily English Practice</p>
        <h1 className="font-display font-bold text-4xl sm:text-6xl text-[#1E1B2E] dark:text-white tracking-tight mb-5">
          Find Your Voice.<br />Share Your Wisdom.
        </h1>
        <p className="text-[16px] sm:text-[18px] text-[#6B6478] dark:text-violet-300/70 mb-8 max-w-xl mx-auto">
          Write, speak, and talk your way to fluent English — with an AI coach that catches your mistakes and shows you exactly how to improve.
        </p>
        <Link
          href="/sign-up"
          className="inline-block font-mono text-sm uppercase bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:scale-[1.03] text-white px-8 py-4 rounded-full shadow-lg shadow-violet-500/30 cursor-pointer transition-all"
        >
          Start practicing free
        </Link>
      </section>

      <section className="relative max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white/70 dark:bg-[#1A1530]/80 backdrop-blur-xl border border-white/60 dark:border-violet-900/40 rounded-2xl p-5 hover:scale-[1.03] transition-transform"
            >
              <span className="text-2xl block mb-2">{f.icon}</span>
              <h3 className="font-display font-semibold text-[15px] text-[#1E1B2E] dark:text-white mb-1">{f.title}</h3>
              <p className="text-[12.5px] text-[#6B6478] dark:text-violet-300/70">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}