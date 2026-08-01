'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Something went wrong.');
      setLoading(false);
      return;
    }

    const signInRes = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) setError('Account created, but sign-in failed — try signing in manually.');
    else router.push('/app');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EEF2FF] via-[#F5F3FF] to-[#FDF4FF] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 p-8">
        <h1 className="font-bold text-2xl text-[#1E1B2E] mb-1">Create your account</h1>
        <p className="text-sm text-[#6B6478] mb-6">Start tracking your progress.</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white/60 rounded-xl border border-violet-100 px-4 py-2.5 mb-3 text-sm text-[#1E1B2E] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-violet-400"
          required
        />
        <input
          type="password"
          placeholder="Password (6+ characters)"
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
          {loading ? 'Creating account…' : 'Sign up'}
        </button>

        <p className="text-xs text-[#6B6478] mt-4 text-center">
          Already have an account? <Link href="/sign-in" className="text-violet-600 underline">Sign in</Link>
        </p>
      </form>
    </main>
  );
}