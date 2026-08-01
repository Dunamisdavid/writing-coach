import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password || password.length < 6) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } });
  await prisma.passwordResetToken.delete({ where: { token } });

  return NextResponse.json({ ok: true });
}