'use client';

import { useEffect, useState } from 'react';
import type { Language } from '@/lib/translate';

const READING_LANGUAGES: Language[] = ['Arabic', 'English', 'German', 'Japanese', 'Vietnamese'];

async function translateText(text: string, from: Language, to: Language): Promise<string> {
  if (!text.trim() || from === to) return text;

  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, from, to }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to translate text');
  }

  return data.translation;
}

// The vocabulary API only ever returns Vietnamese/English pairs, so resolving
// the answer field to Vietnamese or English is a lookup; any other language
// requires translating from the known English text.
async function resolveAnswerText(
  vietnameseText: string,
  englishText: string,
  language: Language
): Promise<string> {
  if (language === 'Vietnamese') return vietnameseText;
  if (language === 'English') return englishText;
  return translateText(englishText, 'English', language);
}

interface LanguageFormProps {
  wordLanguage?: Language;
  answerLanguage?: Language;
}

export default function LanguageForm({
  wordLanguage: requestedWordLanguage,
  answerLanguage: requestedAnswerLanguage,
}: LanguageFormProps) {
  const [vietnameseSource, setVietnameseSource] = useState('');
  const [englishSource, setEnglishSource] = useState('');
  const [word, setWord] = useState('');
  const [wordLanguage, setWordLanguage] = useState<Language>(requestedWordLanguage ?? 'Vietnamese');
  const [appliedWordLanguage, setAppliedWordLanguage] = useState(requestedWordLanguage);
  const [answerText, setAnswerText] = useState('');
  const [answerLanguage, setAnswerLanguage] = useState<Language>(requestedAnswerLanguage ?? 'English');
  const [appliedAnswerLanguage, setAppliedAnswerLanguage] = useState(requestedAnswerLanguage);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [speakStatus, setSpeakStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [showAnswer, setShowAnswer] = useState(true);
  const [mode, setMode] = useState<'nouns' | 'verbs' | 'adjectives' | 'easy' | 'medium' | 'hard'>('nouns');

  // Session memory: words/sentences already generated, so the same common
  // ones don't keep coming up. Resets on page reload.
  const [usedWordsByCategory, setUsedWordsByCategory] = useState<
    Record<'nouns' | 'verbs' | 'adjectives', string[]>
  >({ nouns: [], verbs: [], adjectives: [] });
  const [usedSentenceWords, setUsedSentenceWords] = useState<string[]>([]);
  const [usedSentences, setUsedSentences] = useState<string[]>([]);

  // Lets the page-level "I want to learn" selector drive this field's
  // language without taking away the user's ability to change it locally.
  if (requestedWordLanguage && requestedWordLanguage !== appliedWordLanguage) {
    setAppliedWordLanguage(requestedWordLanguage);
    setWordLanguage(requestedWordLanguage);
  }

  // Lets the page-level "I currently speak" selector drive this field's
  // language without taking away the user's ability to change it locally.
  if (requestedAnswerLanguage && requestedAnswerLanguage !== appliedAnswerLanguage) {
    setAppliedAnswerLanguage(requestedAnswerLanguage);
    setAnswerLanguage(requestedAnswerLanguage);
  }

  const maskText = (text: string) => text.replace(/\S/g, '•');

  const handleSpeak = async () => {
    if (!word.trim()) return;

    setSpeakStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: word }),
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

  const handleGetWord = async () => {
    setStatus('loading');
    setMessage('');

    const category = mode as 'nouns' | 'verbs' | 'adjectives';

    try {
      const response = await fetch('/api/language/word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category, usedWords: usedWordsByCategory[category] }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate a new word');
      }

      setVietnameseSource(data.vietnamese);
      setEnglishSource(data.english);
      setShowAnswer(false);
      setStatus('success');
      setUsedWordsByCategory((prev) => ({
        ...prev,
        [category]: [...prev[category], data.vietnamese].slice(-100),
      }));
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

    try {
      const response = await fetch('/api/language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          complexity: mode,
          usedWords: usedSentenceWords,
          usedSentences: usedSentences.slice(-8),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate a new sentence');
      }

      setVietnameseSource(data.vietnamese);
      setEnglishSource(data.english);
      setShowAnswer(false);
      setStatus('success');
      setUsedSentences((prev) => [...prev, data.vietnamese].slice(-50));
      setUsedSentenceWords((prev) =>
        Array.from(new Set([...prev, ...(data.wordsUsed ?? [])])).slice(-100)
      );
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error ? error.message : 'Failed to generate a new sentence. Please try again.'
      );
    }
  };

  const handleGetLanguageItem = async () => {
    const isWordMode = ['nouns', 'verbs', 'adjectives'].includes(mode);
    if (isWordMode) {
      await handleGetWord();
    } else {
      await handleGetSentence();
    }
  };

  // Keeps the word field's translation in sync with its language and with
  // whatever word/sentence was last generated.
  useEffect(() => {
    let isCurrent = true;

    translateText(vietnameseSource, 'Vietnamese', wordLanguage)
      .then((text) => {
        if (isCurrent) setWord(text);
      })
      .catch((error) => {
        if (isCurrent) {
          setMessage(
            error instanceof Error ? error.message : 'Failed to translate text. Please try again.'
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [vietnameseSource, wordLanguage]);

  // Keeps the answer field's translation in sync with its language and with
  // whatever word/sentence was last generated.
  useEffect(() => {
    let isCurrent = true;

    resolveAnswerText(vietnameseSource, englishSource, answerLanguage)
      .then((text) => {
        if (isCurrent) setAnswerText(text);
      })
      .catch((error) => {
        if (isCurrent) {
          setMessage(
            error instanceof Error ? error.message : 'Failed to translate text. Please try again.'
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [vietnameseSource, englishSource, answerLanguage]);

  return (
    <div className="space-y-6">
      {/* Word/Sentence Field */}
      <div>
        <select
          id="wordLanguage"
          name="wordLanguage"
          value={wordLanguage}
          onChange={(e) => setWordLanguage(e.target.value as Language)}
          className="mb-2 px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
        >
          {READING_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <div className="flex flex-col sm:flex-row gap-3">
          <textarea
            id="word"
            name="word"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Press Get New Sentence to generate one"
            rows={3}
            className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
          />
          <button
            type="button"
            onClick={handleSpeak}
            disabled={!word.trim() || speakStatus === 'loading'}
            className="px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex-shrink-0 sm:self-start"
          >
            {speakStatus === 'loading' ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
            ) : (
              'Speak'
            )}
          </button>
        </div>
      </div>

      {/* Answer Field */}
      <div>
        <select
          id="answerLanguage"
          name="answerLanguage"
          value={answerLanguage}
          onChange={(e) => setAnswerLanguage(e.target.value as Language)}
          className="mb-2 px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
        >
          {READING_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <div className="flex flex-col sm:flex-row gap-3">
          <textarea
            id="answer"
            name="answer"
            value={showAnswer ? answerText : maskText(answerText)}
            onChange={(e) => showAnswer && setAnswerText(e.target.value)}
            readOnly={!showAnswer}
            placeholder="The translation will appear here"
            rows={3}
            className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
          />
          <button
            type="button"
            onClick={() => setShowAnswer(!showAnswer)}
            disabled={!answerText.trim()}
            className="px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex-shrink-0 sm:self-start"
          >
            {showAnswer ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <div className="p-4 rounded-lg bg-red-100 border border-red-300 text-red-800">
          {message}
        </div>
      )}

      {/* Difficulty Categories Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <label htmlFor="mode" className="block text-sm font-medium text-dark-blue">
          Difficulty
        </label>
        <select
          id="mode"
          name="mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as 'nouns' | 'verbs' | 'adjectives' | 'easy' | 'medium' | 'hard')}
          className="px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
        >
          <option value="nouns">Nouns/Verbs/Adjectives</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* Get New Item Button */}
      <div className="pt-4 pb-2">
        <button
          type="button"
          onClick={handleGetLanguageItem}
          disabled={status === 'loading'}
          className="w-full px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Generating...
            </span>
          ) : (
            ['nouns', 'verbs', 'adjectives'].includes(mode) ? 'Get New Word' : 'Get New Sentence'
          )}
        </button>
      </div>
    </div>
  );
}
