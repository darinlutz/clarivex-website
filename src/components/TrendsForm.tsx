'use client';

import { useState } from 'react';

export default function TrendsForm() {
  const [focus, setFocus] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [results, setResults] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setStatus('loading');
    setMessage('');
    setResults('');

    try {
      const response = await fetch('/api/trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ focus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to look up trends');
      }

      setStatus('success');
      setResults(data.result);
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error ? error.message : 'Failed to look up trends. Please try again.'
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Focus Field */}
      <div>
        <label htmlFor="focus" className="block text-sm font-medium text-dark-blue mb-2">
          Focus (optional)
        </label>
        <textarea
          id="focus"
          name="focus"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="e.g. Germany, or technology in the United States. Leave blank for the top US trends."
          rows={4}
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
        />
      </div>

      {/* Status Messages */}
      {message && (
        <div className="p-4 rounded-lg bg-red-100 border border-red-300 text-red-800">
          {message}
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2 pb-2">
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Searching Google Trends...
            </span>
          ) : (
            'Submit'
          )}
        </button>
      </div>

      {/* Results Section */}
      <div>
        <label className="block text-sm font-medium text-dark-blue mb-2">Top Trends</label>
        <div className="w-full min-h-[8rem] p-4 rounded-lg bg-white border border-slate-300 text-dark-blue">
          {results ? (
            <p className="whitespace-pre-wrap leading-relaxed">{results}</p>
          ) : (
            <span className="text-slate-400">The top trends will appear here after you press Submit.</span>
          )}
        </div>
      </div>
    </form>
  );
}
