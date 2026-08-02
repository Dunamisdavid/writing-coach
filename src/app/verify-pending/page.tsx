'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

export default function VerifyPendingPage() {
    const [sent, setSent] = useState(false);

    async function resend() {
        await fetch('/api/resend-verification', { method: 'POST' });
        setSent(true);
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EEF2FF] via-[#F5F3FF] to-[#FDF4FF] px-4">
            <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 p-8 text-center">
                <h1 className="font-bold text-xl text-[#1E1B2E] mb-2">Verify your email</h1>
                <p className="text-sm text-[#6B6478] mb-5">Check your inbox for a verification link before continuing.</p>
                <button
                    onClick={resend}
                    className="text-violet-600 hover:text-violet-800 underline text-sm cursor-pointer transition-colors block w-full text-center mb-4"
                >
                    {sent ? 'Sent! Check your inbox.' : 'Resend verification email'}
                </button>
                <button onClick={() => signOut({ callbackUrl: '/sign-in' })} className="text-[#9CA3AF] hover:text-[#6B6478] text-xs cursor-pointer transition-colors">
                    Sign out
                </button>
            </div>
        </main>
    );
}