'use client';

import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true); // always show success, even if email doesn't exist — avoids leaking which emails are registered
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EEF2FF] via-[#F5F3FF] to-[#FDF4FF] px-4">
      <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 p-8">
        {sent ? (
          <>
            <h1 className="font-bold text-xl text-[#1E1B2E] mb-2">Check your email</h1>
            <p className="text-sm text-[#6B6478]">If an account exists for {email}, a reset link is on its way.</p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 className="font-bold text-xl text-[#1E1B2E] mb-1">Reset your password</h1>
            <p className="text-sm text-[#6B6478] mb-5">Enter your email and we'll send you a reset link.</p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/60 rounded-xl border border-violet-100 px-4 py-2.5 mb-3 text-sm text-[#1E1B2E] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-violet-400"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white text-sm font-medium py-2.5 rounded-full disabled:opacity-50 cursor-pointer transition-colors"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}