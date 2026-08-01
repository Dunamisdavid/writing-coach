export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = {
    sm: { bars: [8, 14, 10], barW: 2.5, gap: 2, h: 18, un: 'text-lg', silent: 'text-[10px]' },
    md: { bars: [10, 18, 13], barW: 3, gap: 2.5, h: 22, un: 'text-2xl', silent: 'text-xs' },
    lg: { bars: [16, 30, 22], barW: 5, gap: 4, h: 36, un: 'text-4xl sm:text-5xl', silent: 'text-base sm:text-lg' },
  }[size];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-end" style={{ gap: dims.gap, height: dims.h }}>
        {dims.bars.map((h, i) => (
          <div key={i} className="rounded-full bg-gradient-to-t from-violet-600 to-fuchsia-500" style={{ width: dims.barW, height: h }} />
        ))}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`font-display font-extrabold ${dims.un} bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent tracking-tight`}>UN</span>
        <span className={`font-display font-medium ${dims.silent} text-[#9CA3AF] dark:text-violet-400/60 tracking-widest uppercase`}>silent</span>
      </div>
    </div>
  );
}