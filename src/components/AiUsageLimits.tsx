'use client';

import { useCallback, useEffect, useState } from 'react';

import type { OpenAIUsage } from '@/lib/openaiUsage';

async function fetchUsage(): Promise<OpenAIUsage> {
  const res = await fetch('/api/ai-usage-limits');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load AI usage');
  return data;
}

export default function AiUsageLimits() {
  const [usage, setUsage] = useState<OpenAIUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Subscribes the state to one request; used on mount and by Refresh
  const load = useCallback(() => {
    return fetchUsage()
      .then((data) => {
        setUsage(data);
        setError('');
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = () => {
    setLoading(true);
    void load();
  };

  const money = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: usage?.currency.toUpperCase() || 'USD' }).format(value);
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'Never');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {usage ? `Spend so far in ${usage.month}: ` : ''}
          {usage && <span className="font-semibold text-dark-blue">{money(usage.totalSpend)}</span>}
        </p>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="px-4 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg text-dark-blue hover:border-powder-600 hover:text-powder-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg border text-sm bg-red-50 border-red-200 text-red-900">{error}</div>
      )}

      {usage && (
        <>
          <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-dark-blue">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">API Key</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Key Value</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Project</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Last Used</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">Monthly Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {usage.keys.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-slate-500">
                      No API keys found.
                    </td>
                  </tr>
                )}
                {usage.keys.map((key) => (
                  <tr key={key.id}>
                    <th scope="row" className="px-4 py-3 font-semibold text-dark-blue">{key.name}</th>
                    <td className="px-4 py-3 font-mono text-xs">{key.redactedValue}</td>
                    <td className="px-4 py-3">{key.project}</td>
                    <td className="px-4 py-3">{when(key.lastUsed)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(key.projectSpend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            OpenAI reports spend per project, not per key, so each key shows its project&apos;s spend for the month
            so far. Keys in the same project share that amount.
          </p>
        </>
      )}
    </div>
  );
}
