'use client';

import { useState } from 'react';
import LanguageForm from '@/components/LanguageForm';
import type { Language } from '@/lib/translate';

const TRANSLATOR_LANGUAGES: Language[] = ['Arabic', 'English', 'German', 'Japanese', 'Vietnamese'];

const LANGUAGE_CODES: Record<Language, string> = {
  Arabic: 'ar',
  English: 'en',
  German: 'de',
  Japanese: 'ja',
  Vietnamese: 'vi',
};

export default function Language() {
  const [activeTab, setActiveTab] = useState<'reading' | 'writing' | 'translator' | 'friend'>(
    'reading'
  );
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
  const [translatorLanguage, setTranslatorLanguage] = useState<Language>('Vietnamese');
  const [translatorSecondLanguage, setTranslatorSecondLanguage] = useState<Language>('English');
  const [isSwapped, setIsSwapped] = useState(false);
  const [translatorStatus, setTranslatorStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [translatorMessage, setTranslatorMessage] = useState('');
  const [translatorSpeakStatus, setTranslatorSpeakStatus] = useState<
    'idle' | 'loading' | 'error'
  >('idle');

  const [friendMessages, setFriendMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([]);
  const [friendStarted, setFriendStarted] = useState(false);
  const [friendInput, setFriendInput] = useState('');
  const [friendStatus, setFriendStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [friendMessage, setFriendMessage] = useState('');
  const [friendDifficulty, setFriendDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [friendInputTranslation, setFriendInputTranslation] = useState('');
  const [friendSpeakStatus, setFriendSpeakStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [friendReplyTranslation, setFriendReplyTranslation] = useState('');
  const [showFriendReplyTranslation, setShowFriendReplyTranslation] = useState(false);

  const maskText = (text: string) => text.replace(/\S/g, '•');

  const fromLanguage: Language = isSwapped ? translatorSecondLanguage : translatorLanguage;
  const toLanguage: Language = isSwapped ? translatorLanguage : translatorSecondLanguage;

  const handleFromLanguageChange = (lang: Language) => {
    if (isSwapped) {
      setTranslatorSecondLanguage(lang);
    } else {
      setTranslatorLanguage(lang);
    }
    setTranslatorTopText('');
    setTranslatorBottomText('');
    setTranslatorMessage('');
  };

  const handleToLanguageChange = (lang: Language) => {
    if (isSwapped) {
      setTranslatorLanguage(lang);
    } else {
      setTranslatorSecondLanguage(lang);
    }
    handleTranslate(lang);
  };

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

  const handleTranslatorSpeak = async (text: string) => {
    if (!text.trim()) return;

    setTranslatorSpeakStatus('loading');
    setTranslatorMessage('');

    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
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

  const handleTranslate = async (toLanguageOverride?: Language) => {
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
          from: fromLanguage,
          to: toLanguageOverride ?? toLanguage,
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

  const playFriendSpeech = async (text: string) => {
    if (!text.trim()) return;

    setFriendSpeakStatus('loading');

    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
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

      setFriendSpeakStatus('idle');
    } catch (error) {
      setFriendSpeakStatus('error');
      setFriendMessage(
        error instanceof Error ? error.message : 'Failed to play audio. Please try again.'
      );
    }
  };

  const translateFriendReply = async (text: string) => {
    if (!text.trim()) return;

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          from: 'Vietnamese',
          to: 'English',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to translate text');
      }

      setFriendReplyTranslation(data.translation);
    } catch {
      // Silently ignore translation errors so they don't interrupt the chat.
    }
  };

  const handleToggleFriendReplyTranslation = () => {
    setShowFriendReplyTranslation((prev) => !prev);
  };

  const handleFriendSpeak = () => {
    const lastAssistantMessage = [...friendMessages].reverse().find((msg) => msg.role === 'assistant');
    if (lastAssistantMessage) {
      playFriendSpeech(lastAssistantMessage.content);
    }
  };

  const handleFriendStart = async () => {
    setFriendStatus('loading');
    setFriendMessage('');

    try {
      const response = await fetch('/api/friend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ history: [], difficulty: friendDifficulty }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start the conversation');
      }

      setFriendMessages([{ role: 'assistant', content: data.reply }]);
      setFriendStarted(true);
      setFriendStatus('idle');
      playFriendSpeech(data.reply);
      translateFriendReply(data.reply);
    } catch (error) {
      setFriendStatus('error');
      setFriendMessage(
        error instanceof Error ? error.message : 'Failed to start the conversation. Please try again.'
      );
    }
  };

  const handleFriendSend = async () => {
    if (!friendInput.trim()) return;

    const updatedMessages = [...friendMessages, { role: 'user' as const, content: friendInput }];
    setFriendMessages(updatedMessages);
    setFriendInput('');
    setFriendInputTranslation('');
    setFriendStatus('loading');
    setFriendMessage('');

    try {
      const response = await fetch('/api/friend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ history: updatedMessages, difficulty: friendDifficulty }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get a reply');
      }

      setFriendMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
      setFriendStatus('idle');
      playFriendSpeech(data.reply);
      translateFriendReply(data.reply);
    } catch (error) {
      setFriendStatus('error');
      setFriendMessage(
        error instanceof Error ? error.message : 'Failed to get a reply. Please try again.'
      );
    }
  };

  const handleFriendTranslateInput = async () => {
    if (!friendInput.trim()) return;

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: friendInput,
          from: 'Vietnamese',
          to: 'English',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to translate text');
      }

      setFriendInputTranslation(data.translation);
    } catch {
      // Silently ignore translation errors so they don't interrupt the chat.
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
            <button
              onClick={() => setActiveTab('friend')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'friend'
                  ? 'text-powder-600 border-powder-600'
                  : 'text-slate-600 border-transparent hover:text-dark-blue'
              }`}
            >
              Friend
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
                      <textarea
                        value={maskText(vietnameseText)}
                        readOnly
                        placeholder="Press Get New Sentence to generate one"
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                        rows={3}
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
                  {/* From Field (top, editable) */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <label htmlFor="translatorFrom" className="block text-sm font-medium text-dark-blue">
                        From
                      </label>
                      <select
                        id="translatorFromLanguage"
                        name="translatorFromLanguage"
                        value={fromLanguage}
                        onChange={(e) => handleFromLanguageChange(e.target.value as Language)}
                        className="px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
                      >
                        {TRANSLATOR_LANGUAGES.map((lang) => (
                          <option key={lang} value={lang}>
                            {lang}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <textarea
                        id="translatorFrom"
                        name="translatorFrom"
                        lang={LANGUAGE_CODES[fromLanguage]}
                        value={translatorTopText}
                        onChange={(e) => setTranslatorTopText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === ' ') {
                            handleTranslate();
                          }
                        }}
                        placeholder={`Type ${fromLanguage} text here`}
                        rows={3}
                        className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleTranslatorSpeak(translatorTopText)}
                        disabled={!translatorTopText.trim() || translatorSpeakStatus === 'loading'}
                        className="px-5 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex-shrink-0 sm:self-start"
                      >
                        {translatorSpeakStatus === 'loading' ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                        ) : (
                          'Speak'
                        )}
                      </button>
                    </div>
                  </div>

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

                  {/* To Field (bottom, read-only) */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <label htmlFor="translatorTo" className="block text-sm font-medium text-dark-blue">
                        To
                      </label>
                      <select
                        id="translatorToLanguage"
                        name="translatorToLanguage"
                        value={toLanguage}
                        onChange={(e) => handleToLanguageChange(e.target.value as Language)}
                        className="px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
                      >
                        {TRANSLATOR_LANGUAGES.map((lang) => (
                          <option key={lang} value={lang}>
                            {lang}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <textarea
                        id="translatorTo"
                        name="translatorTo"
                        lang={LANGUAGE_CODES[toLanguage]}
                        value={translatorBottomText}
                        readOnly
                        placeholder="The translation will appear here"
                        rows={3}
                        className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleTranslatorSpeak(translatorBottomText)}
                        disabled={!translatorBottomText.trim() || translatorSpeakStatus === 'loading'}
                        className="px-5 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex-shrink-0 sm:self-start"
                      >
                        {translatorSpeakStatus === 'loading' ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                        ) : (
                          'Speak'
                        )}
                      </button>
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
                      onClick={() => handleTranslate()}
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

            {/* Friend Tab */}
            {activeTab === 'friend' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Friend</h2>
                <p className="text-slate-600 mb-8">
                  Chat with a Vietnamese-speaking friend who asks you questions using words from your
                  vocabulary notes. Reply in Vietnamese in the text box below.
                </p>

                <div className="space-y-4">
                  {/* Difficulty Selector */}
                  <div>
                    <label htmlFor="friendDifficulty" className="block text-sm font-medium text-dark-blue mb-2">
                      Difficulty
                    </label>
                    <select
                      id="friendDifficulty"
                      value={friendDifficulty}
                      onChange={(e) => setFriendDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {/* Chat History */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 space-y-3 max-h-96 overflow-y-auto p-4 bg-white border border-slate-300 rounded-lg">
                      {friendMessages.length === 0 ? (
                        <p className="text-slate-400 text-sm">Press Start Chat to begin.</p>
                      ) : (
                        friendMessages.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[80%] px-4 py-2 rounded-lg whitespace-pre-wrap ${
                                msg.role === 'user'
                                  ? 'bg-powder-500 text-white'
                                  : 'bg-slate-100 text-dark-blue'
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex flex-row sm:flex-col gap-3 flex-shrink-0 sm:self-end">
                      <button
                        type="button"
                        onClick={handleFriendSpeak}
                        disabled={!friendMessages.some((msg) => msg.role === 'assistant') || friendSpeakStatus === 'loading'}
                        className="px-5 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
                      >
                        {friendSpeakStatus === 'loading' ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                        ) : (
                          'Speak'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleFriendReplyTranslation}
                        disabled={!friendMessages.some((msg) => msg.role === 'assistant')}
                        className="px-5 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
                      >
                        {showFriendReplyTranslation ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {/* English Translation of the chatbot's most recent message */}
                  {showFriendReplyTranslation && (
                    <input
                      type="text"
                      value={friendReplyTranslation}
                      readOnly
                      placeholder="The English translation will appear here"
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
                    />
                  )}

                  {/* Status Message */}
                  {friendMessage && (
                    <div className="p-4 rounded-lg bg-red-100 border border-red-300 text-red-800">
                      {friendMessage}
                    </div>
                  )}

                  {!friendStarted ? (
                    <button
                      type="button"
                      onClick={handleFriendStart}
                      disabled={friendStatus === 'loading'}
                      className="w-full px-6 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
                    >
                      {friendStatus === 'loading' ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Starting...
                        </span>
                      ) : (
                        'Start Chat'
                      )}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <textarea
                          value={friendInput}
                          onChange={(e) => setFriendInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === ' ') {
                              handleFriendTranslateInput();
                            }
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleFriendSend();
                            }
                          }}
                          placeholder="Type your response in Vietnamese"
                          rows={2}
                          className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                        />
                        <button
                          type="button"
                          onClick={handleFriendSend}
                          disabled={!friendInput.trim() || friendStatus === 'loading'}
                          className="px-6 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex-shrink-0 sm:self-start"
                        >
                          {friendStatus === 'loading' ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                          ) : (
                            'Send'
                          )}
                        </button>
                      </div>

                      {/* English Translation (read-only, updates as you type) */}
                      <div>
                        <label htmlFor="friendInputTranslation" className="block text-sm font-medium text-dark-blue mb-2">
                          English Translation
                        </label>
                        <textarea
                          id="friendInputTranslation"
                          value={friendInputTranslation}
                          readOnly
                          placeholder="The English translation will appear here as you type"
                          rows={2}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
