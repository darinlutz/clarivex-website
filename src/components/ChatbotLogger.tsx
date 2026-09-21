'use client';

import { useState } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatbotLogger() {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [botMessage, setBotMessage] = useState('');
  const [userInput, setUserInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const handleSend = async () => {
    const message = userInput.trim();
    if (!message) return;

    setStatus('loading');
    try {
      const response = await fetch('/api/chatbot-logger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, history, sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reach the chatbot');
      }

      setBotMessage(data.response);
      setSessionId(data.sessionId);
      setHistory((prev) => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: data.response },
      ]);
      setUserInput('');
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setBotMessage(error instanceof Error ? error.message : 'Failed to reach the chatbot');
    }
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-8">
      <label htmlFor="chatbot-message" className="block text-sm font-medium text-dark-blue mb-2">
        Chatbot Message
      </label>
      <textarea
        id="chatbot-message"
        value={botMessage}
        readOnly
        placeholder="The chatbot's reply will appear here"
        rows={8}
        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
      />

      <label htmlFor="chatbot-input" className="block text-sm font-medium text-dark-blue mb-2 mt-4">
        Your Message
      </label>
      <textarea
        id="chatbot-input"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="Type your message"
        rows={3}
        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
      />

      <button
        type="button"
        onClick={handleSend}
        disabled={status === 'loading' || !userInput.trim()}
        className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
      >
        {status === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Sending...
          </span>
        ) : (
          'Send Message'
        )}
      </button>
    </div>
  );
}
