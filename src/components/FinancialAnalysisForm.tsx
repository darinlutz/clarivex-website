'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function FinancialAnalysisForm() {
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [results, setResults] = useState('');
  const [chart, setChart] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!instructions.trim()) {
      setMessage('Please enter instructions before submitting.');
      return;
    }

    setStatus('loading');
    setMessage('');
    setResults('');
    setChart(null);

    try {
      const response = await fetch('/api/financial-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: instructions }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run financial analysis');
      }

      setStatus('success');
      setResults(data.result);
      setChart(data.chart ?? null);
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error ? error.message : 'Failed to run financial analysis. Please try again.'
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Instructions Field */}
      <div>
        <label htmlFor="instructions" className="block text-sm font-medium text-dark-blue mb-2">
          Instructions
        </label>
        <textarea
          id="instructions"
          name="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. What was the last closing stock price of AAPL?"
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
              Analyzing...
            </span>
          ) : (
            'Submit'
          )}
        </button>
      </div>

      {/* Results Section */}
      <div>
        <label className="block text-sm font-medium text-dark-blue mb-2">Results</label>
        <div className="w-full min-h-[8rem] p-4 rounded-lg bg-white border border-slate-300 text-dark-blue space-y-4">
          {results ? (
            <p className="whitespace-pre-wrap leading-relaxed">{results}</p>
          ) : (
            <span className="text-slate-400">Results will appear here after you submit a query.</span>
          )}
          {chart && (
            <Image
              src={chart}
              alt="Generated stock chart"
              width={1200}
              height={600}
              unoptimized
              className="w-full h-auto rounded-lg border border-slate-200"
            />
          )}
        </div>
      </div>
    </form>
  );
}
