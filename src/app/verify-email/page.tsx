'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    fetch('/api/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => setStatus(res.ok ? 'success' : 'error'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 p-8 text-center">
      {status === 'checking' && <p className="text-sm text-[#6B6478]">Verifying…</p>}
      {status === 'success' && (
        <>
          <h1 className="font-bold text-xl text-[#1E1B2E] mb-2">Email verified 🎉</h1>
          <Link href="/sign-in" className="text-violet-600 hover:text-violet-800 underline text-sm cursor-pointer transition-colors">
            Go to sign in
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 className="font-bold text-xl text-[#1E1B2E] mb-2">Link invalid or expired</h1>
          <Link href="/verify-pending" className="text-violet-600 hover:text-violet-800 underline text-sm cursor-pointer transition-colors">
            Request a new link
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EEF2FF] via-[#F5F3FF] to-[#FDF4FF] px-4">
      <Suspense fallback={<div className="text-[#6B6478] text-sm">Loading…</div>}>
        <VerifyEmailInner />
      </Suspense>
    </main>
  );
}