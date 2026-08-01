'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) setError(data.error || 'Something went wrong.');
    else setDone(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EEF2FF] via-[#F5F3FF] to-[#FDF4FF] px-4">
      <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 p-8">
        {done ? (
          <>
            <h1 className="font-bold text-xl text-[#1E1B2E] mb-2">Password updated</h1>
            <button onClick={() => router.push('/sign-in')} className="text-violet-600 underline text-sm">
              Go to sign in
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 className="font-bold text-xl text-[#1E1B2E] mb-1">Set a new password</h1>
            <p className="text-sm text-[#6B6478] mb-5">Choose a new password for your account.</p>
            <input
              type="password"
              placeholder="New password (6+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/60 rounded-xl border border-violet-100 px-4 py-2.5 mb-3 text-sm text-[#1E1B2E] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-violet-400"
              required
            />
            {error && <p className="text-rose-500 text-xs mb-3">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white text-sm font-medium py-2.5 rounded-full disabled:opacity-50 cursor-pointer transition-colors"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}