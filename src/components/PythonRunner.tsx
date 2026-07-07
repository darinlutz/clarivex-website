'use client';

import { useState } from 'react';

export default function PythonRunner() {
  const [result, setResult] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const handleRun = async () => {
    setStatus('loading');
    try {
      const response = await fetch('/api/run-python', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run app.py');
      }

      setResult(data.result);
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setResult(error instanceof Error ? error.message : 'Failed to run app.py');
    }
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-8">
      <label htmlFor="python-result" className="block text-sm font-medium text-dark-blue mb-2">
        Python Result
      </label>
      <textarea
        id="python-result"
        value={result}
        readOnly
        rows={6}
        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
      />
      <button
        type="button"
        onClick={handleRun}
        disabled={status === 'loading'}
        className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
      >
        {status === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Running...
          </span>
        ) : (
          'Run Python App'
        )}
      </button>
    </div>
  );
}
