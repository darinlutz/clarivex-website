'use client';

import { useState } from 'react';

export default function SpaceFactQuery() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [references, setReferences] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleAsk = async () => {
    if (!query.trim()) return;

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/space-fact-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to query space facts');
      }

      setResponse(data.response);
      setReferences(data.references ?? []);
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to query space facts');
    }
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-8">
      <label htmlFor="space-fact-query" className="block text-sm font-medium text-dark-blue mb-2">
        Ask a Question About Space
      </label>
      <textarea
        id="space-fact-query"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g., What is the Hubble Space Telescope?"
        rows={3}
        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
      />

      <button
        type="button"
        onClick={handleAsk}
        disabled={status === 'loading' || !query.trim()}
        className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
      >
        {status === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Asking...
          </span>
        ) : (
          'Ask'
        )}
      </button>

      {message && (
        <div className="mt-4 p-4 rounded-lg bg-red-100 border border-red-300 text-red-800">
          {message}
        </div>
      )}

      {response && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-dark-blue mb-2">Response</h3>
          <div className="p-4 rounded-lg bg-white border border-slate-200 text-dark-blue whitespace-pre-wrap leading-relaxed">
            {response}
          </div>
        </div>
      )}

      {references.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-dark-blue mb-2">References Used</h3>
          <ul className="space-y-2">
            {references.map((ref, index) => (
              <li
                key={index}
                className="p-3 rounded-lg bg-white border border-slate-200 text-dark-blue text-sm"
              >
                {ref}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
