'use client';

import { useState } from 'react';

// Emails a new verification link to an account that hasn't verified its
// address yet (POST /api/auth/verify-email). Used after signing up and when
// logging in to an unverified account.
export default function ResendVerificationButton({ emailAddress }: { emailAddress: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const resend = async () => {
    setState('sending');
    setError('');
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailAddress }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send the verification email');
      }
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send the verification email');
      setState('idle');
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={resend}
        disabled={state !== 'idle'}
        className="w-full px-6 py-3 rounded-lg border border-powder-600 text-powder-600 font-semibold hover:bg-powder-600 hover:text-white transition-colors disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending...' : state === 'sent' ? 'Verification Email Sent' : 'Resend Verification Email'}
      </button>
      {state === 'sent' && (
        <p className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          We sent a new link to {emailAddress}. It expires in 3 days.
        </p>
      )}
      {error && <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</p>}
    </div>
  );
}
