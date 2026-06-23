'use client';

import { useState } from 'react';

export default function LanguageForm() {
  const [vietnamese, setVietnamese] = useState('');
  const [english, setEnglish] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleGetSentence = async () => {
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/language', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate a new sentence');
      }

      setVietnamese(data.vietnamese);
      setEnglish(data.english);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error ? error.message : 'Failed to generate a new sentence. Please try again.'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Vietnamese Field */}
      <div>
        <label htmlFor="vietnamese" className="block text-sm font-medium text-dark-blue mb-2">
          Vietnamese
        </label>
        <input
          type="text"
          id="vietnamese"
          name="vietnamese"
          value={vietnamese}
          onChange={(e) => setVietnamese(e.target.value)}
          placeholder="Press Get New Sentence to generate one"
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
        />
      </div>

      {/* English Field */}
      <div>
        <label htmlFor="english" className="block text-sm font-medium text-dark-blue mb-2">
          English
        </label>
        <input
          type="text"
          id="english"
          name="english"
          value={english}
          onChange={(e) => setEnglish(e.target.value)}
          placeholder="The translation will appear here"
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
        />
      </div>

      {/* Status Messages */}
      {message && (
        <div className="p-4 rounded-lg bg-red-100 border border-red-300 text-red-800">
          {message}
        </div>
      )}

      {/* Get New Sentence Button */}
      <div className="pt-4 pb-2">
        <button
          type="button"
          onClick={handleGetSentence}
          disabled={status === 'loading'}
          className="w-full px-6 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Generating...
            </span>
          ) : (
            'Get New Sentence'
          )}
        </button>
      </div>
    </div>
  );
}
