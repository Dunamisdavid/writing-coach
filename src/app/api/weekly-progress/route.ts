    import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const count = await prisma.entry.count({ where: { createdAt: { gte: monday } } });
  return NextResponse.json({ count });
}