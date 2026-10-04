'use client';

import Link from 'next/link';
import { useState } from 'react';

const inputClass =
  'w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors';

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-6">
        <p className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          Your password has been reset.
        </p>
        <Link
          href="/login"
          className="block w-full text-center px-6 py-3 rounded-lg bg-gradient-to-r from-powder-500 to-powder-600 text-white font-semibold hover:shadow-lg transition-all"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-dark-blue mb-2">
          Password * <span className="text-slate-500 font-normal">(at least 8 characters)</span>
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      {error && (
        <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-powder-500 to-powder-600 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-60"
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  );
}
