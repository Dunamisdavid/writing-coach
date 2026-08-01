'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError('Incorrect email or password.');
    else router.push('/app');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EEF2FF] via-[#F5F3FF] to-[#FDF4FF] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 p-8">
        <h1 className="font-bold text-2xl text-[#1E1B2E] mb-1">Welcome back</h1>
        <p className="text-sm text-[#6B6478] mb-6">Sign in to continue practicing.</p>

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
          placeholder="Password"
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-xs text-[#6B6478] mt-4 text-center">
          No account? <Link href="/sign-up" className="text-violet-600 underline">Sign up</Link>
        </p>
        <p className="text-xs text-[#6B6478] mt-2 text-center">
          <Link href="/forgot-password" className="text-violet-600 underline">Forgot password?</Link>
        </p>
      </form>
    </main>
  );
}