'use client';

import { useState } from 'react';
import LanguageForm from '@/components/LanguageForm';

export default function Language() {
  const [activeTab, setActiveTab] = useState<'reading' | 'writing' | 'translator'>('reading');
  const [vietnameseText, setVietnameseText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [showVietnamese, setShowVietnamese] = useState(true);
  const [englishText, setEnglishText] = useState('');
  const [complexity, setComplexity] = useState<
    'nouns' | 'verbs' | 'adjectives' | 'easy' | 'medium' | 'hard'
  >('easy');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const [translatorTopText, setTranslatorTopText] = useState('');
  const [translatorBottomText, setTranslatorBottomText] = useState('');
  const [isSwapped, setIsSwapped] = useState(false);
  const [translatorStatus, setTranslatorStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [translatorMessage, setTranslatorMessage] = useState('');
  const [translatorSpeakStatus, setTranslatorSpeakStatus] = useState<
    'idle' | 'loading' | 'error'
  >('idle');

  const fromLanguage = isSwapped ? 'English' : 'Vietnamese';
  const toLanguage = isSwapped ? 'Vietnamese' : 'English';
  const translatorVietnameseText = isSwapped ? translatorBottomText : translatorTopText;

  const handleGetWord = async () => {
    setStatus('loading');
    setMessage('');
    setUserInput('');
    setShowVietnamese(false);

    try {
      const response = await fetch('/api/language/word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: complexity }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate a new word');
      }

      setVietnameseText(data.vietnamese);
      setEnglishText(data.english);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error ? error.message : 'Failed to generate a new word. Please try again.'
      );
    }
  };

  const handleGetSentence = async () => {
    setStatus('loading');
    setMessage('');
    setUserInput('');
    setShowVietnamese(false);

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

  const handleGetLanguageItem = async () => {
    const isWordMode = ['nouns', 'verbs', 'adjectives'].includes(complexity);
    if (isWordMode) {
      await handleGetWord();
    } else {
      await handleGetSentence();
    }
  };

  const handleTranslatorSpeak = async () => {
    if (!translatorVietnameseText.trim()) return;

    setTranslatorSpeakStatus('loading');
    setTranslatorMessage('');

    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: translatorVietnameseText }),
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

      setTranslatorSpeakStatus('idle');
    } catch (error) {
      setTranslatorSpeakStatus('error');
      setTranslatorMessage(
        error instanceof Error ? error.message : 'Failed to play audio. Please try again.'
      );
    }
  };

  const handleTranslate = async () => {
    if (!translatorTopText.trim()) return;

    setTranslatorStatus('loading');
    setTranslatorMessage('');

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: translatorTopText,
          direction: isSwapped ? 'en-to-vi' : 'vi-to-en',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to translate text');
      }

      setTranslatorBottomText(data.translation);
      setTranslatorStatus('success');
    } catch (error) {
      setTranslatorStatus('error');
      setTranslatorMessage(
        error instanceof Error ? error.message : 'Failed to translate text. Please try again.'
      );
    }
  };

  const handleSwap = () => {
    setIsSwapped(!isSwapped);
    setTranslatorTopText(translatorBottomText);
    setTranslatorBottomText(translatorTopText);
    setTranslatorMessage('');
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
            <button
              onClick={() => setActiveTab('translator')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'translator'
                  ? 'text-powder-600 border-powder-600'
                  : 'text-slate-600 border-transparent hover:text-dark-blue'
              }`}
            >
              Translator
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

                  {/* English Display */}
                  <div>
                    <label className="block text-sm font-medium text-dark-blue mb-2">English</label>
                    <textarea
                      value={englishText}
                      readOnly
                      placeholder="The translation will appear here"
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Complexity Selector */}
                  <div>
                    <label htmlFor="complexity" className="block text-sm font-medium text-dark-blue mb-2">
                      Complexity
                    </label>
                    <select
                      id="complexity"
                      value={complexity}
                      onChange={(e) =>
                        setComplexity(
                          e.target.value as 'nouns' | 'verbs' | 'adjectives' | 'easy' | 'medium' | 'hard'
                        )
                      }
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
                    >
                      <option value="nouns">Nouns/Verbs/Adjectives</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {/* Status Message */}
                  {message && (
                    <div className={`p-3 rounded-lg text-sm ${status === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {message}
                    </div>
                  )}

                  {/* Get New Word/Sentence Button */}
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleGetLanguageItem}
                      disabled={status === 'loading'}
                      className="w-full px-6 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
                    >
                      {status === 'loading' ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Generating...
                        </span>
                      ) : ['nouns', 'verbs', 'adjectives'].includes(complexity) ? (
                        'Get New Word'
                      ) : (
                        'Get New Sentence'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Translator Tab */}
            {activeTab === 'translator' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Translator</h2>
                <p className="text-slate-600 mb-8">
                  Type {fromLanguage} text below and press Translate to see the {toLanguage} translation.
                </p>

                <div className="space-y-6">
                  {/* Swap Button */}
                  <div>
                    <button
                      type="button"
                      onClick={handleSwap}
                      className="px-4 py-2 text-sm bg-powder-500 text-white rounded-lg hover:bg-powder-600 transition-colors"
                    >
                      Swap
                    </button>
                  </div>

                  {/* From Field (top, editable) */}
                  <div>
                    <label htmlFor="translatorFrom" className="block text-sm font-medium text-dark-blue mb-2">
                      From {fromLanguage}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <textarea
                        id="translatorFrom"
                        name="translatorFrom"
                        value={translatorTopText}
                        onChange={(e) => setTranslatorTopText(e.target.value)}
                        placeholder={`Type ${fromLanguage} text here`}
                        rows={3}
                        className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                      />
                      {!isSwapped && (
                        <button
                          type="button"
                          onClick={handleTranslatorSpeak}
                          disabled={!translatorTopText.trim() || translatorSpeakStatus === 'loading'}
                          className="px-5 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex-shrink-0 sm:self-start"
                        >
                          {translatorSpeakStatus === 'loading' ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                          ) : (
                            'Speak'
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* To Field (bottom, read-only) */}
                  <div>
                    <label htmlFor="translatorTo" className="block text-sm font-medium text-dark-blue mb-2">
                      To {toLanguage}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <textarea
                        id="translatorTo"
                        name="translatorTo"
                        value={translatorBottomText}
                        readOnly
                        placeholder="The translation will appear here"
                        rows={3}
                        className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                      />
                      {isSwapped && (
                        <button
                          type="button"
                          onClick={handleTranslatorSpeak}
                          disabled={!translatorBottomText.trim() || translatorSpeakStatus === 'loading'}
                          className="px-5 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex-shrink-0 sm:self-start"
                        >
                          {translatorSpeakStatus === 'loading' ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                          ) : (
                            'Speak'
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status Messages */}
                  {translatorMessage && (
                    <div className="p-4 rounded-lg bg-red-100 border border-red-300 text-red-800">
                      {translatorMessage}
                    </div>
                  )}

                  {/* Translate Button */}
                  <div className="pt-4 pb-2">
                    <button
                      type="button"
                      onClick={handleTranslate}
                      disabled={!translatorTopText.trim() || translatorStatus === 'loading'}
                      className="w-full px-6 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
                    >
                      {translatorStatus === 'loading' ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Translating...
                        </span>
                      ) : (
                        'Translate'
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
