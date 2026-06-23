'use client';

import { useState } from 'react';
import LanguageForm from '@/components/LanguageForm';

export default function Language() {
  const [activeTab, setActiveTab] = useState<'reading' | 'writing'>('reading');
  const [vietnameseText, setVietnameseText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [showEnglish, setShowEnglish] = useState(false);
  const [showVietnamese, setShowVietnamese] = useState(true);
  const [englishText, setEnglishText] = useState('');
  const [complexity, setComplexity] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleGetSentence = async () => {
    setStatus('loading');
    setMessage('');
    setUserInput('');
    setShowEnglish(false);
    setShowVietnamese(true);

    try {
      const response = await fetch('/api/language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ complexity }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate a new sentence');
      }

      setVietnameseText(data.vietnamese);
      setEnglishText(data.english);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error ? error.message : 'Failed to generate a new sentence. Please try again.'
      );
    }
  };

  const isMatch = vietnameseText === userInput && userInput.length > 0;

  return (
    <div className="w-full">
      {/* Header Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-100 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-powder-600 via-powder-500 to-powder-600 bg-clip-text text-transparent">
            Language
          </h1>
          <p className="text-lg text-slate-600">
            Practice Vietnamese with a new sentence built from words you already know.
          </p>
        </div>
      </section>

      {/* Language Practice Content */}
      <section className="py-16 px-6 sm:px-10 lg:px-16 bg-white flex flex-col items-center">
        <div className="w-full max-w-3xl">
          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('reading')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'reading'
                  ? 'text-powder-600 border-powder-600'
                  : 'text-slate-600 border-transparent hover:text-dark-blue'
              }`}
            >
              Reading & Speaking
            </button>
            <button
              onClick={() => setActiveTab('writing')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'writing'
                  ? 'text-powder-600 border-powder-600'
                  : 'text-slate-600 border-transparent hover:text-dark-blue'
              }`}
            >
              Writing
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-8">
            {/* Reading & Speaking Tab */}
            {activeTab === 'reading' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Reading & Speaking</h2>
                <p className="text-slate-600 mb-8">
                  Press the button below to generate a new sentence based on your vocabulary notes.
                </p>
                <LanguageForm />
              </div>
            )}

            {/* Writing Tab */}
            {activeTab === 'writing' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Writing</h2>
                <p className="text-slate-600 mb-8">
                  Translate the Vietnamese sentence shown below by typing it in the text box.
                </p>

                <div className="space-y-4">
                  {/* Vietnamese Display */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-dark-blue">Vietnamese</label>
                      <button
                        type="button"
                        onClick={() => setShowVietnamese(!showVietnamese)}
                        disabled={status === 'loading' || !vietnameseText}
                        className="px-3 py-1 text-sm bg-powder-500 text-white rounded hover:bg-powder-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {showVietnamese ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {showVietnamese ? (
                      <textarea
                        value={vietnameseText}
                        readOnly
                        placeholder="Press Get New Sentence to generate one"
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                        rows={3}
                      />
                    ) : (
                      <input
                        type="password"
                        value={vietnameseText}
                        readOnly
                        placeholder="Press Get New Sentence to generate one"
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
                      />
                    )}
                  </div>

                  {/* User Input Box */}
                  <div>
                    <label className="block text-sm font-medium text-dark-blue mb-2">
                      Type Vietnamese Here
                    </label>
                    <textarea
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Type your Vietnamese translation here"
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                      rows={3}
                    />
                    <div className={`mt-2 text-sm font-semibold ${isMatch ? 'text-green-600' : 'text-red-600'}`}>
                      {isMatch ? 'MATCH' : 'No Match'}
                    </div>
                  </div>

                  {/* Complexity Selector */}
                  <div>
                    <label htmlFor="complexity" className="block text-sm font-medium text-dark-blue mb-2">
                      Complexity
                    </label>
                    <select
                      id="complexity"
                      value={complexity}
                      onChange={(e) => setComplexity(e.target.value as 'easy' | 'medium' | 'hard')}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {/* English Display */}
                  {showEnglish && (
                    <div>
                      <label className="block text-sm font-medium text-dark-blue mb-2">
                        English
                      </label>
                      <textarea
                        value={englishText}
                        readOnly
                        placeholder="The translation will appear here"
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Status Message */}
                  {message && (
                    <div className={`p-3 rounded-lg text-sm ${status === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {message}
                    </div>
                  )}

                  {/* Get New Sentence Button */}
                  <div className="pt-4">
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
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
