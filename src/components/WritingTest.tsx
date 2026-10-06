'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { Language } from '@/lib/translate';
import type { WordCategory } from '@/lib/language';
import type { AlignedSegment } from '@/lib/wordAlignment';
import ColoredSegments from '@/components/ColoredSegments';
import TestDifficultySelector from '@/components/TestDifficultySelector';
import {
  alignTexts,
  FEMALE_VOICE,
  fetchTestItem,
  MALE_VOICE,
  playChime,
  playError,
  speakText,
  TEST_LANGUAGES,
  withLanguages,
  type TestDifficulty,
  type TestHistory,
  type TestItem,
} from '@/lib/languageTestClient';

type SpeakStatus = 'idle' | 'loading' | 'error';

type Alignment = {
  key: string;
  sentenceSegments: AlignedSegment[];
  translationSegments: AlignedSegment[];
};

interface WritingTestProps {
  learnLanguage: Language;
  userLanguage: Language;
  // Bumped by the page whenever the vocabulary sheet changes
  sheetVersion?: number;
}

export default function WritingTest({ learnLanguage, userLanguage, sheetVersion = 0 }: WritingTestProps) {
  const [wordLanguage, setWordLanguage] = useState<Language>(learnLanguage);
  const [appliedWordLanguage, setAppliedWordLanguage] = useState(learnLanguage);
  const [answerLanguage, setAnswerLanguage] = useState<Language>(userLanguage);
  const [appliedAnswerLanguage, setAppliedAnswerLanguage] = useState(userLanguage);
  const [difficulty, setDifficulty] = useState<TestDifficulty>('words');
  const [wordCategory, setWordCategory] = useState<WordCategory>('adjectives');
  const [item, setItem] = useState<TestItem | null>(null);
  const [userInput, setUserInput] = useState('');
  const [showText, setShowText] = useState(true);
  const [result, setResult] = useState<'none' | 'correct' | 'wrong'>('none');
  const [alignment, setAlignment] = useState<Alignment | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [speakStatus, setSpeakStatus] = useState<SpeakStatus>('idle');
  const [speakFemaleStatus, setSpeakFemaleStatus] = useState<SpeakStatus>('idle');

  // Session memory so the same words/sentences don't keep coming up.
  // Resets on page reload.
  const history = useRef<TestHistory>({ usedWordsByCategory: {}, recentSentences: [] });
  const nextItemId = useRef(1);

  // Lets the page-level "I want to learn" / "I speak" selectors drive this
  // tab's comboboxes without taking away the user's ability to change them.
  if (learnLanguage !== appliedWordLanguage) {
    setAppliedWordLanguage(learnLanguage);
    setWordLanguage(learnLanguage);
  }
  if (userLanguage !== appliedAnswerLanguage) {
    setAppliedAnswerLanguage(userLanguage);
    setAnswerLanguage(userLanguage);
  }

  const wordText = item?.texts[wordLanguage] ?? '';
  const answerText = item?.texts[answerLanguage] ?? '';
  const solved = result === 'correct';
  const alignmentKey = item ? `${item.id}|${wordLanguage}|${answerLanguage}` : '';
  const currentAlignment = alignment?.key === alignmentKey ? alignment : null;

  // Translates the current item into whichever languages the comboboxes
  // were switched to.
  useEffect(() => {
    if (!item) return;
    if (item.texts[wordLanguage] !== undefined && item.texts[answerLanguage] !== undefined) return;

    let isCurrent = true;
    withLanguages(item, [wordLanguage, answerLanguage])
      .then((updated) => {
        if (isCurrent) setItem((prev) => (prev?.id === updated.id ? updated : prev));
      })
      .catch((error) => {
        if (isCurrent) {
          setMessage(error instanceof Error ? error.message : 'Failed to translate text. Please try again.');
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [item, wordLanguage, answerLanguage]);

  // Once answered correctly, pairs up the words of the text and its
  // translation (again if either language is changed) to color them.
  useEffect(() => {
    if (!solved || !wordText || !answerText || currentAlignment || wordLanguage === answerLanguage) {
      return;
    }

    let isCurrent = true;
    const key = alignmentKey;
    alignTexts(wordText, wordLanguage, answerText, answerLanguage).then((segments) => {
      // Coloring is a nice-to-have; without it the text stays plain
      if (isCurrent && segments) setAlignment({ key, ...segments });
    });

    return () => {
      isCurrent = false;
    };
  }, [solved, wordText, answerText, currentAlignment, alignmentKey, wordLanguage, answerLanguage]);

  const speak = async (text: string, voice: string, setSpeak: (s: SpeakStatus) => void) => {
    if (!text.trim()) return;

    setSpeak('loading');
    try {
      await speakText(text, voice);
      setSpeak('idle');
    } catch (error) {
      setSpeak('error');
      setMessage(error instanceof Error ? error.message : 'Failed to play audio. Please try again.');
    }
  };

  const handleStartTest = async () => {
    setStatus('loading');
    setMessage('');

    try {
      const newItem = await withLanguages(
        await fetchTestItem(
          nextItemId.current++,
          difficulty,
          wordCategory,
          wordLanguage,
          answerLanguage,
          history.current
        ),
        [wordLanguage, answerLanguage]
      );
      setItem(newItem);
      setUserInput('');
      setResult('none');
      setShowText(false);
      setStatus('idle');

      speak(newItem.texts[wordLanguage] ?? '', MALE_VOICE, setSpeakStatus);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to start the test. Please try again.');
    }
  };

  const handleSubmit = () => {
    if (!wordText || solved) return;

    if (userInput === wordText) {
      setResult('correct');
      setShowText(true);
      playChime();
      speak(wordText, FEMALE_VOICE, setSpeakFemaleStatus);
    } else {
      setResult('wrong');
      playError();
    }
  };

  const maskText = (text: string) => text.replace(/\S/g, '•');
  const selectClassName =
    'px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors';
  const buttonClassName =
    'px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100';
  const spinner = (
    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
  );

  return (
    <div className="space-y-6">
      {/* Word/Sentence Display */}
      <div>
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <select
            id="writingTestWordLanguage"
            name="writingTestWordLanguage"
            value={wordLanguage}
            onChange={(e) => setWordLanguage(e.target.value as Language)}
            className={selectClassName}
          >
            {TEST_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowText(!showText)}
            disabled={!wordText}
            aria-label={showText ? 'Hide' : 'Show'}
            title={showText ? 'Hide' : 'Show'}
            className={buttonClassName}
          >
            {showText ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {solved && currentAlignment ? (
            // A textarea can't color individual words, so once solved the
            // text is shown in a box styled like it.
            <div className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue text-[2rem] whitespace-pre-wrap break-words">
              <ColoredSegments segments={currentAlignment.sentenceSegments} />
            </div>
          ) : (
            <textarea
              id="writingTestWord"
              name="writingTestWord"
              value={showText ? wordText : maskText(wordText)}
              readOnly
              placeholder="Press Start Test to get one"
              rows={2}
              className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none text-[2rem]"
            />
          )}
          <div className="flex flex-row sm:flex-col gap-3 flex-shrink-0 sm:self-start">
            <button
              type="button"
              onClick={() => speak(wordText, MALE_VOICE, setSpeakStatus)}
              disabled={!wordText.trim() || speakStatus === 'loading'}
              aria-label="Speak"
              title="Speak"
              className={buttonClassName}
            >
              {speakStatus === 'loading' ? spinner : <span aria-hidden="true">🔊 ♂</span>}
            </button>
            <button
              type="button"
              onClick={() => speak(wordText, FEMALE_VOICE, setSpeakFemaleStatus)}
              disabled={!wordText.trim() || speakFemaleStatus === 'loading'}
              aria-label="Speak (female voice)"
              title="Speak (female voice)"
              className={buttonClassName}
            >
              {speakFemaleStatus === 'loading' ? spinner : <span aria-hidden="true">🔊 ♀</span>}
            </button>
          </div>
        </div>
      </div>

      {/* User Input Box */}
      <div>
        <label htmlFor="writingTestInput" className="block text-sm font-medium text-dark-blue mb-2">
          Type {wordLanguage} Here
        </label>
        <textarea
          id="writingTestInput"
          name="writingTestInput"
          value={userInput}
          onChange={(e) => {
            setUserInput(e.target.value);
            if (result === 'wrong') setResult('none');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          readOnly={solved}
          placeholder={`Type the ${wordLanguage} you hear, then press Submit`}
          rows={2}
          className={`w-full px-4 py-3 bg-white rounded-lg text-dark-blue focus:outline-none focus:ring-1 transition-colors resize-none ${
            result === 'correct'
              ? 'border-4 border-green-600 focus:ring-green-600'
              : result === 'wrong'
                ? 'border-2 border-red-600 focus:ring-red-600'
                : 'border border-slate-300 focus:border-powder-600 focus:ring-powder-500'
          }`}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!wordText || !userInput || solved}
          className={`mt-3 w-full ${buttonClassName}`}
        >
          Submit
        </button>
        {result !== 'none' && (
          <div className={`mt-2 text-sm font-semibold ${solved ? 'text-green-600' : 'text-red-600'}`}>
            {solved ? 'MATCH' : 'No Match - try again'}
          </div>
        )}
      </div>

      {/* Translation Display */}
      <div>
        <select
          id="writingTestAnswerLanguage"
          name="writingTestAnswerLanguage"
          value={answerLanguage}
          onChange={(e) => setAnswerLanguage(e.target.value as Language)}
          className={`mb-2 ${selectClassName}`}
        >
          {TEST_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        {solved && currentAlignment ? (
          <div className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue whitespace-pre-wrap break-words">
            <ColoredSegments segments={currentAlignment.translationSegments} />
          </div>
        ) : (
          <textarea
            value={answerText}
            readOnly
            placeholder="The translation will appear here"
            rows={2}
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
          />
        )}
      </div>

      {/* Status Messages */}
      {message && (
        <div className="p-4 rounded-lg bg-red-100 border border-red-300 text-red-800">{message}</div>
      )}

      {/* Difficulty / Word Category Selectors */}
      <TestDifficultySelector
        idPrefix="writingTest"
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        wordCategory={wordCategory}
        onWordCategoryChange={setWordCategory}
        sheetVersion={sheetVersion}
      />

      {/* Start Test Button */}
      <div className="pt-4 pb-2">
        <button
          type="button"
          onClick={handleStartTest}
          disabled={status === 'loading'}
          className={`w-full ${buttonClassName}`}
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              {spinner}
              Generating...
            </span>
          ) : (
            'Start Test'
          )}
        </button>
      </div>
    </div>
  );
}
