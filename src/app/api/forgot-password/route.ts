import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import prisma from '@/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond success even if user doesn't exist — prevents revealing which emails are registered
  if (!user) return NextResponse.json({ ok: true });

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Reset your Marginal password',
      html: `
        <p>You asked to reset your password.</p>
        <p><a href="${resetUrl}">Click here to set a new password</a> — this link expires in 1 hour.</p>
        <p>If you didn't request this, you can ignore this email.</p>
      `,
    });
  } catch (err) {
    console.error('Failed to send reset email:', err);
  }

  return NextResponse.json({ ok: true });
}