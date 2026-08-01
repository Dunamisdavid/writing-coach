import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const entries = await prisma.entry.findMany({ where: { userId }, select: { scores: true, corrections: true, createdAt: true } });

  const totalEntries = entries.length;
  const days = new Set(entries.map((e) => e.createdAt.toISOString().slice(0, 10)));
  const totalCorrections = entries.reduce((sum, e) => sum + ((e.corrections as any[])?.length || 0), 0);
  const maxOverall = entries.reduce((max, e) => Math.max(max, (e.scores as any)?.overall || 0), 0);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const cursor = new Date(today);
  if (!days.has(todayStr)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const badges = [
    { id: 'first_steps', label: 'First Steps', icon: '🌱', description: 'Complete your first session', earned: totalEntries >= 1 },
    { id: 'consistent', label: 'Consistent', icon: '📅', description: '3-day practice streak', earned: streak >= 3 },
    { id: 'week_warrior', label: 'Week Warrior', icon: '🔥', description: '7-day practice streak', earned: streak >= 7 },
    { id: 'high_scorer', label: 'High Scorer', icon: '⭐', description: 'Score 90+ on any session', earned: maxOverall >= 90 },
    { id: 'fifty_club', label: '50 Club', icon: '📚', description: 'Learn 50 corrections total', earned: totalCorrections >= 50 },
    { id: 'century_club', label: 'Century Club', icon: '🏆', description: 'Learn 100 corrections total', earned: totalCorrections >= 100 },
    { id: 'dedicated', label: 'Dedicated', icon: '💪', description: 'Complete 20 sessions', earned: totalEntries >= 20 },
  ];

  return NextResponse.json({ badges, stats: { totalEntries, totalCorrections, maxOverall, streak } });
}