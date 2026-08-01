import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const entries = await prisma.entry.findMany({
    where: { userId },
    select: { corrections: true },
  });

  const tagCounts: Record<string, number> = {};
  for (const entry of entries) {
    const corrections = (entry.corrections as any[]) || [];
    for (const c of corrections) {
      const tag = c.tag || 'Other';
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const ranked = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return NextResponse.json(ranked);
}