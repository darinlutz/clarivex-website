'use client';

import { useState } from 'react';

export default function AgentRunner() {
  const [instructions, setInstructions] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const handleRun = async () => {
    if (!instructions.trim()) return;

    setStatus('loading');
    setOutput('');
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instructions }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run the agent');
      }

      setOutput(data.output);
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setOutput(error instanceof Error ? error.message : 'Failed to run the agent');
    }
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-8">
      <label htmlFor="agent-instructions" className="block text-sm font-medium text-dark-blue mb-2">
        Instructions
      </label>
      <textarea
        id="agent-instructions"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Tell the agent what to do, e.g. Find three highly rated ramen spots in Tokyo and summarize each."
        rows={4}
        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
      />

      <button
        type="button"
        onClick={handleRun}
        disabled={status === 'loading' || !instructions.trim()}
        className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
      >
        {status === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Running...
          </span>
        ) : (
          'Run Agent'
        )}
      </button>

      <label htmlFor="agent-output" className="block text-sm font-medium text-dark-blue mb-2 mt-4">
        Output
      </label>
      <textarea
        id="agent-output"
        value={output}
        readOnly
        rows={14}
        className={`w-full px-4 py-3 bg-white border rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none ${
          status === 'error' ? 'border-red-300' : 'border-slate-300'
        }`}
      />
    </div>
  );
}
