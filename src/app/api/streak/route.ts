import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const entries = await prisma.entry.findMany({ where: { userId }, select: { createdAt: true } });
  const days = new Set(entries.map((e) => e.createdAt.toISOString().slice(0, 10)));

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const practicedToday = days.has(todayStr);

  const cursor = new Date(today);
  if (!practicedToday) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return NextResponse.json({ streak, practicedToday });
}