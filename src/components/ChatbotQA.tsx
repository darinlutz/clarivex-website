'use client';

import { useState } from 'react';

export default function ChatbotQA() {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const handleSend = async () => {
    if (!message.trim()) return;

    setStatus('loading');
    try {
      const response = await fetch('/api/chatbot-qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reach the chatbot');
      }

      const sources: string[] = data.sources ?? [];
      setResult(
        sources.length > 0
          ? `${data.answer}\n\nSources:\n${sources.map((source) => `- ${source}`).join('\n')}`
          : data.answer
      );
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setResult(error instanceof Error ? error.message : 'Failed to reach the chatbot');
    }
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-8">
      <label htmlFor="chatbot-qa-message" className="block text-sm font-medium text-dark-blue mb-2">
        Your Message
      </label>
      <textarea
        id="chatbot-qa-message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask a question, e.g. What is an NFT?"
        rows={4}
        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
      />

      <button
        type="button"
        onClick={handleSend}
        disabled={status === 'loading' || !message.trim()}
        className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
      >
        {status === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Sending...
          </span>
        ) : (
          'Send'
        )}
      </button>

      <label
        htmlFor="chatbot-qa-result"
        className="block text-sm font-medium text-dark-blue mb-2 mt-4"
      >
        Result
      </label>
      <textarea
        id="chatbot-qa-result"
        value={result}
        readOnly
        rows={14}
        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
      />
    </div>
  );
}
