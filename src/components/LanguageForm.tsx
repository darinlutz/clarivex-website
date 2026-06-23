'use client';

import { useState } from 'react';

export default function LanguageForm() {
  const [vietnamese, setVietnamese] = useState('');
  const [english, setEnglish] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [speakStatus, setSpeakStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [showEnglish, setShowEnglish] = useState(true);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');

  const maskText = (text: string) => text.replace(/\S/g, '•');

  const handleSpeak = async () => {
    if (!vietnamese.trim()) return;

    setSpeakStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: vietnamese }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      await audio.play();

      setSpeakStatus('idle');
    } catch (error) {
      setSpeakStatus('error');
      setMessage(
        error instanceof Error ? error.message : 'Failed to play audio. Please try again.'
      );
    }
  };

  const handleGetSentence = async () => {
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ difficulty }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate a new sentence');
      }

      setVietnamese(data.vietnamese);
      setEnglish(data.english);
      setShowEnglish(false);
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
        <div className="flex flex-col sm:flex-row gap-3">
          <textarea
            id="vietnamese"
            name="vietnamese"
            value={vietnamese}
            onChange={(e) => setVietnamese(e.target.value)}
            placeholder="Press Get New Sentence to generate one"
            rows={3}
            className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
          />
          <button
            type="button"
            onClick={handleSpeak}
            disabled={!vietnamese.trim() || speakStatus === 'loading'}
            className="px-5 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex-shrink-0 sm:self-start"
          >
            {speakStatus === 'loading' ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
            ) : (
              'Speak'
            )}
          </button>
        </div>
      </div>

      {/* English Field */}
      <div>
        <label htmlFor="english" className="block text-sm font-medium text-dark-blue mb-2">
          English
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <textarea
            id="english"
            name="english"
            value={showEnglish ? english : maskText(english)}
            onChange={(e) => showEnglish && setEnglish(e.target.value)}
            readOnly={!showEnglish}
            placeholder="The translation will appear here"
            rows={3}
            className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
          />
          <button
            type="button"
            onClick={() => setShowEnglish(!showEnglish)}
            disabled={!english.trim()}
            className="px-5 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex-shrink-0 sm:self-start"
          >
            {showEnglish ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <div className="p-4 rounded-lg bg-red-100 border border-red-300 text-red-800">
          {message}
        </div>
      )}

      {/* Difficulty Selector */}
      <div>
        <label htmlFor="difficulty" className="block text-sm font-medium text-dark-blue mb-2">
          Difficulty
        </label>
        <select
          id="difficulty"
          name="difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
          className="w-32 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

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
