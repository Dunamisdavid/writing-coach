import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerified) return NextResponse.json({ ok: true });

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.emailVerificationToken.create({ data: { userId, token, expiresAt } });

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: user.email,
    subject: 'Verify your UNSILENT account',
    html: `<p><a href="${verifyUrl}">Verify my email</a> — this link expires in 24 hours.</p>`,
  });

  return NextResponse.json({ ok: true });
}