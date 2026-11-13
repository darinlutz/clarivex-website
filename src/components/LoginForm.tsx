'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ForgotPasswordForm from './ForgotPasswordForm';
import ResendVerificationButton from './ResendVerificationButton';

const inputClass =
  'w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors';

// `emailVerified` is the result of opening an emailed verification link
// (GET /api/auth/verify-email): '1' when it worked, 'invalid' when it didn't.
export default function LoginForm({ emailVerified }: { emailVerified?: string }) {
  const router = useRouter();
  const [formData, setFormData] = useState({ emailAddress: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNeedsVerification(false);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNeedsVerification(data.verificationRequired === true);
        throw new Error(data.error || 'Failed to log in');
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log in');
      setLoading(false);
    }
  };

  if (forgotPassword) {
    return <ForgotPasswordForm onBack={() => setForgotPassword(false)} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {emailVerified === '1' && (
        <p className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          Your email address is verified. You can log in now.
        </p>
      )}
      {emailVerified === 'invalid' && (
        <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          That verification link is invalid or has expired. Log in to have a new one sent.
        </p>
      )}

      <div>
        <label htmlFor="emailAddress" className="block text-sm font-medium text-dark-blue mb-2">
          Email Address
        </label>
        <input
          type="email"
          id="emailAddress"
          name="emailAddress"
          value={formData.emailAddress}
          onChange={handleChange}
          required
          autoComplete="email"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-dark-blue mb-2">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>

      {error && (
        <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</p>
      )}
      {needsVerification && <ResendVerificationButton emailAddress={formData.emailAddress} />}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-powder-500 to-powder-600 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-60"
      >
        {loading ? 'Logging in...' : 'Log In'}
      </button>

      <p className="text-center text-sm text-slate-600">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-powder-600 hover:underline font-medium">
          Sign up
        </Link>
      </p>
      <p className="text-center text-sm text-slate-600">
        Forgot password?{' '}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setForgotPassword(true);
          }}
          className="text-powder-600 hover:underline font-medium"
        >
          Click here
        </a>
      </p>
    </form>
  );
}
