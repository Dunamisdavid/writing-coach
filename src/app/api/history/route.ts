import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const entries = await prisma.entry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return NextResponse.json(entries);
}