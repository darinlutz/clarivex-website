'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AiLockdown } from '@/lib/aiLockdown';

// The Admin page's emergency AI lockdown switch (src/lib/aiLockdown.ts).
// Turning it on takes one click; turning it back off asks first.
export default function AiLockdownSwitch({ initial }: { initial: AiLockdown }) {
  const router = useRouter();
  const [lockdown, setLockdown] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { locked } = lockdown;

  const toggle = async () => {
    if (locked && !window.confirm('Turn the AI features back on?')) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/ai-lockdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked: !locked }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to change the lockdown');
      }
      setLockdown(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change the lockdown');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`rounded-xl border-2 p-6 sm:p-8 transition-colors ${
        locked ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-dark-blue">Emergency AI Lockdown</h2>
          <p className="text-slate-600 mt-1">
            Stops every AI feature on the site at once, for everyone, until it is switched back off.
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
            locked ? 'bg-red-600 text-white' : 'bg-green-100 text-green-700'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${locked ? 'bg-white animate-pulse' : 'bg-green-500'}`} />
          {locked ? 'Locked down' : 'AI running'}
        </span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={locked}
        onClick={toggle}
        disabled={saving}
        className={`w-full px-6 py-4 rounded-lg font-bold text-lg text-white transition-all disabled:opacity-60 ${
          locked
            ? 'bg-gradient-to-r from-powder-500 to-powder-600 hover:shadow-lg'
            : 'bg-red-600 hover:bg-red-700 hover:shadow-lg'
        }`}
      >
        {saving ? 'Saving...' : locked ? 'Turn AI Back On' : 'Lock Down All AI Now'}
      </button>

      {error && <p className="mt-4 p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm">{error}</p>}

      <ul className="mt-6 space-y-1 text-sm text-slate-600 list-disc pl-5">
        <li>While locked down, no AI request is started, including by Admins.</li>
        <li>The lockdown stays on through restarts and deploys until an Admin turns it off here.</li>
        <li>A request that is already running when you switch it on finishes its current call; nothing new starts.</li>
      </ul>

      {lockdown.updatedAt && (
        <p className="mt-4 text-sm text-slate-500">
          Last changed {new Date(lockdown.updatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
          {lockdown.updatedBy ? ` by ${lockdown.updatedBy}` : ''}.
        </p>
      )}
    </div>
  );
}
