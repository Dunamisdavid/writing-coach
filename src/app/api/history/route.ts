import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

  export async function GET() {
  const entries = await prisma.entry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return NextResponse.json(entries);
} 