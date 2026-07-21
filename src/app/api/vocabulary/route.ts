import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const entries = await prisma.entry.findMany({
    select: { corrections: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const seen = new Map<string, { original: string; fixed: string; count: number; lastSeen: Date }>();

  for (const entry of entries) {
    const corrections = (entry.corrections as any[]) || [];
    for (const c of corrections) {
      const isVocab = /word choice|vocabulary/i.test(c.tag || '');
      if (!isVocab || !c.original || !c.fixed) continue;

      const key = c.original.toLowerCase().trim();
      if (seen.has(key)) {
        seen.get(key)!.count += 1;
      } else {
        seen.set(key, { original: c.original, fixed: c.fixed, count: 1, lastSeen: entry.createdAt });
      }
    }
  }

  const words = Array.from(seen.values()).sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  return NextResponse.json(words.slice(0, 24));
}