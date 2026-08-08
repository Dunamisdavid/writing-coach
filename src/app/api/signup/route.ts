import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import prisma from '@/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

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

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await prisma.emailVerificationToken.create({ data: { userId: user.id, token, expiresAt } });

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

  try {
    await resend.emails.send({
      from: 'hello@unsilent.name.ng',
      to: email,
      subject: 'Verify your UNSILENT account',
      html: `<p>Welcome! Click below to verify your email:</p><p><a href="${verifyUrl}">Verify my email</a> — this link expires in 24 hours.</p>`,
    });
  } catch (err) {
    console.error('Failed to send verification email:', err);
  }

  return NextResponse.json({ id: user.id, email: user.email });
}