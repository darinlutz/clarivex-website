'use client';

import { useState } from 'react';

export default function OllamaSearch() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const handleSearch = async () => {
    if (!query.trim()) return;

    setStatus('loading');
    try {
      const response = await fetch('/api/ollama-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run OllamaSearch.py');
      }

      setResult(data.result);
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setResult(error instanceof Error ? error.message : 'Failed to run OllamaSearch.py');
    }
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-8">
      <label htmlFor="ollama-search-query" className="block text-sm font-medium text-dark-blue mb-2">
        Search
      </label>
      <textarea
        id="ollama-search-query"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter search here"
        rows={4}
        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
      />

      <label htmlFor="ollama-search-result" className="block text-sm font-medium text-dark-blue mb-2 mt-4">
        Result
      </label>
      <textarea
        id="ollama-search-result"
        value={result}
        readOnly
        rows={20}
        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
      />

      <button
        type="button"
        onClick={handleSearch}
        disabled={status === 'loading' || !query.trim()}
        className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
      >
        {status === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Searching...
          </span>
        ) : (
          'Search'
        )}
      </button>
    </div>
  );
}
