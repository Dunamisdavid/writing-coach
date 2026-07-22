import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const entries = await prisma.entry.findMany({
    select: { scores: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const byDay = new Map<string, { sum: any; count: number }>();

  for (const e of entries) {
    const day = e.createdAt.toISOString().slice(0, 10);
    const s = (e.scores as any) || {};
    if (!byDay.has(day)) {
      byDay.set(day, { sum: { grammar: 0, tense: 0, vocabulary: 0, clarity: 0, natural: 0, overall: 0 }, count: 0 });
    }
    const entry = byDay.get(day)!;
    entry.count += 1;
    for (const key of ['grammar', 'tense', 'vocabulary', 'clarity', 'natural', 'overall']) {
      entry.sum[key] += s[key] || 0;
    }
  }

  const result = Array.from(byDay.entries()).map(([day, { sum, count }]) => ({
    day: new Date(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    overall: Math.round(sum.overall / count),
    grammar: Math.round(sum.grammar / count),
    vocabulary: Math.round(sum.vocabulary / count),
    clarity: Math.round(sum.clarity / count),
  }));

  return NextResponse.json(result);
}