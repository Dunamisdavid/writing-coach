import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: 'Email and a password (6+ characters) are required.' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, passwordHash } });

  return NextResponse.json({ id: user.id, email: user.email });
}