'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
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
// the Writing tab's answer field to Vietnamese or English is a lookup; any
// other language requires translating from the known English text.
async function resolveWritingAnswerText(
  vietnameseText: string,
  englishText: string,
  language: Language
): Promise<string> {
  if (language === 'Vietnamese') return vietnameseText;
  if (language === 'English') return englishText;
  return translateText(englishText, 'English', language);
}

export default function Language() {
  const [activeTab, setActiveTab] = useState<
    'reading' | 'writing' | 'translator' | 'friend' | 'matching'
  >('reading');
  const [userLanguage, setUserLanguage] = useState<Language>('English');
  const [learnLanguage, setLearnLanguage] = useState<Language>('Vietnamese');
  const [vietnameseText, setVietnameseText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [showVietnamese, setShowVietnamese] = useState(true);
  const [writingWordText, setWritingWordText] = useState('');
  const [writingWordLanguage, setWritingWordLanguage] = useState<Language>('Vietnamese');
  const [englishSource, setEnglishSource] = useState('');
  const [writingAnswerText, setWritingAnswerText] = useState('');
  const [writingAnswerLanguage, setWritingAnswerLanguage] = useState<Language>(userLanguage);
  const [appliedWritingAnswerLanguage, setAppliedWritingAnswerLanguage] = useState(userLanguage);
  const [appliedWritingWordLanguage, setAppliedWritingWordLanguage] = useState(learnLanguage);
  const [complexity, setComplexity] = useState<
    'nouns' | 'verbs' | 'adjectives' | 'easy' | 'medium' | 'hard'
  >('easy');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const [translatorTopText, setTranslatorTopText] = useState('');
  const [translatorBottomText, setTranslatorBottomText] = useState('');
  const [translatorLanguage, setTranslatorLanguage] = useState<Language>('Vietnamese');
  const [translatorSecondLanguage, setTranslatorSecondLanguage] = useState<Language>('English');
  const [appliedTranslatorBottomLanguage, setAppliedTranslatorBottomLanguage] = useState(userLanguage);
  const [appliedTranslatorTopLanguage, setAppliedTranslatorTopLanguage] = useState(learnLanguage);
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
  const [friendLanguage, setFriendLanguage] = useState<Language>('Vietnamese');
  const [friendInputTranslation, setFriendInputTranslation] = useState('');
  const [friendInputTranslationLanguage, setFriendInputTranslationLanguage] =
    useState<Language>('English');
  const [appliedFriendBottomLanguage, setAppliedFriendBottomLanguage] = useState(userLanguage);
  const [appliedFriendTopLanguage, setAppliedFriendTopLanguage] = useState(learnLanguage);
  const [friendSpeakStatus, setFriendSpeakStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [friendReplyTranslation, setFriendReplyTranslation] = useState('');
  const [showFriendReplyTranslation, setShowFriendReplyTranslation] = useState(false);

  const [matchingLanguage, setMatchingLanguage] = useState<Language>(learnLanguage);
  const [appliedMatchingLanguage, setAppliedMatchingLanguage] = useState(learnLanguage);
  const [matchingDifficulty, setMatchingDifficulty] = useState<
    'nouns' | 'verbs' | 'adjectives' | 'easy' | 'medium' | 'hard'
  >('easy');
  const [matchingSentence, setMatchingSentence] = useState('');
  const [matchingStatus, setMatchingStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [matchingMessage, setMatchingMessage] = useState('');
  const [matchingImageUrl, setMatchingImageUrl] = useState<string | null>(null);
  const [matchingImageStatus, setMatchingImageStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [matchingTranslation, setMatchingTranslation] = useState('');
  const [showMatchingTranslation, setShowMatchingTranslation] = useState(false);
  const [matchingSentence2, setMatchingSentence2] = useState('');
  const [matchingImageUrl2, setMatchingImageUrl2] = useState<string | null>(null);
  const [matchingImageStatus2, setMatchingImageStatus2] = useState<'idle' | 'loading' | 'error'>('idle');
  const [matchingTranslation2, setMatchingTranslation2] = useState('');
  const [showMatchingTranslation2, setShowMatchingTranslation2] = useState(false);
  const [matchingSentence3, setMatchingSentence3] = useState('');
  const [matchingImageUrl3, setMatchingImageUrl3] = useState<string | null>(null);
  const [matchingImageStatus3, setMatchingImageStatus3] = useState<'idle' | 'loading' | 'error'>('idle');
  const [matchingTranslation3, setMatchingTranslation3] = useState('');
  const [showMatchingTranslation3, setShowMatchingTranslation3] = useState(false);

  const maskText = (text: string) => text.replace(/\S/g, '•');

  // Lets the "I currently speak" selector drive the Writing tab's answer
  // language without taking away the user's ability to change it locally.
  if (userLanguage !== appliedWritingAnswerLanguage) {
    setAppliedWritingAnswerLanguage(userLanguage);
    setWritingAnswerLanguage(userLanguage);
  }

  // Lets the "I currently speak" selector drive the Translator tab's bottom
  // (To) combobox, wherever that currently maps to, without taking away the
  // user's ability to change it locally.
  if (userLanguage !== appliedTranslatorBottomLanguage) {
    setAppliedTranslatorBottomLanguage(userLanguage);
    if (isSwapped) {
      setTranslatorLanguage(userLanguage);
    } else {
      setTranslatorSecondLanguage(userLanguage);
    }
  }

  // Lets the "I currently speak" selector drive the Friend tab's bottom
  // (Translation) combobox without taking away the user's ability to change
  // it locally.
  if (userLanguage !== appliedFriendBottomLanguage) {
    setAppliedFriendBottomLanguage(userLanguage);
    setFriendInputTranslationLanguage(userLanguage);
  }

  // Lets the "I want to learn" selector drive the Writing tab's top
  // (word/sentence) combobox without taking away the user's ability to
  // change it locally.
  if (learnLanguage !== appliedWritingWordLanguage) {
    setAppliedWritingWordLanguage(learnLanguage);
    setWritingWordLanguage(learnLanguage);
  }

  // Lets the "I want to learn" selector drive the Translator tab's top
  // (From) combobox, wherever that currently maps to, without taking away
  // the user's ability to change it locally.
  if (learnLanguage !== appliedTranslatorTopLanguage) {
    setAppliedTranslatorTopLanguage(learnLanguage);
    if (isSwapped) {
      setTranslatorSecondLanguage(learnLanguage);
    } else {
      setTranslatorLanguage(learnLanguage);
    }
  }

  // Lets the "I want to learn" selector drive the Friend tab's top
  // (Language) combobox without taking away the user's ability to change it
  // locally.
  if (learnLanguage !== appliedFriendTopLanguage) {
    setAppliedFriendTopLanguage(learnLanguage);
    setFriendLanguage(learnLanguage);
  }

  // Lets the "I want to learn" selector drive the Matching Game tab's
  // Language combobox without taking away the user's ability to change it
  // locally.
  if (learnLanguage !== appliedMatchingLanguage) {
    setAppliedMatchingLanguage(learnLanguage);
    setMatchingLanguage(learnLanguage);
  }

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
      setEnglishSource(data.english);
      setWritingWordText(await translateText(data.vietnamese, 'Vietnamese', writingWordLanguage));
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
      setEnglishSource(data.english);
      setWritingWordText(await translateText(data.vietnamese, 'Vietnamese', writingWordLanguage));
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

  const fetchMatchingSentence = async (
    usedWords: string[] = [],
    usedSentences: string[] = []
  ): Promise<{ vietnamese: string; english: string; wordsUsed: string[] }> => {
    const response = await fetch('/api/language', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ complexity: matchingDifficulty, usedWords, usedSentences }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate a new sentence');
    }

    return data;
  };

  const handleGenerateMatchingSentence = async () => {
    setMatchingStatus('loading');
    setMatchingMessage('');
    setMatchingImageUrl(null);
    setMatchingImageUrl2(null);
    setMatchingImageUrl3(null);

    try {
      const sentence1 = await fetchMatchingSentence();
      setMatchingSentence(await translateText(sentence1.vietnamese, 'Vietnamese', matchingLanguage));
      setMatchingTranslation(await translateText(sentence1.english, 'English', userLanguage));
      void handleFindMatchingImage(sentence1.english);

      const sentence2 = await fetchMatchingSentence(sentence1.wordsUsed, [sentence1.vietnamese]);
      setMatchingSentence2(await translateText(sentence2.vietnamese, 'Vietnamese', matchingLanguage));
      setMatchingTranslation2(await translateText(sentence2.english, 'English', userLanguage));
      void handleFindMatchingImage2(sentence2.english);

      const sentence3 = await fetchMatchingSentence(
        [...sentence1.wordsUsed, ...sentence2.wordsUsed],
        [sentence1.vietnamese, sentence2.vietnamese]
      );
      setMatchingSentence3(await translateText(sentence3.vietnamese, 'Vietnamese', matchingLanguage));
      setMatchingTranslation3(await translateText(sentence3.english, 'English', userLanguage));
      void handleFindMatchingImage3(sentence3.english);

      setMatchingStatus('idle');
    } catch (error) {
      setMatchingStatus('error');
      setMatchingMessage(
        error instanceof Error ? error.message : 'Failed to generate a new sentence. Please try again.'
      );
    }
  };

  const handleToggleMatchingTranslation = () => {
    setShowMatchingTranslation((prev) => !prev);
  };

  const handleToggleMatchingTranslation2 = () => {
    setShowMatchingTranslation2((prev) => !prev);
  };

  const handleToggleMatchingTranslation3 = () => {
    setShowMatchingTranslation3((prev) => !prev);
  };

  const handleFindMatchingImage = async (englishSentence: string) => {
    setMatchingImageStatus('loading');

    try {
      const response = await fetch('/api/language/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: englishSentence }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to find an image');
      }

      setMatchingImageUrl(data.imageUrl ?? null);
      setMatchingImageStatus('idle');
    } catch {
      setMatchingImageUrl(null);
      setMatchingImageStatus('error');
    }
  };

  const handleFindMatchingImage2 = async (englishSentence: string) => {
    setMatchingImageStatus2('loading');

    try {
      const response = await fetch('/api/language/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: englishSentence }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to find an image');
      }

      setMatchingImageUrl2(data.imageUrl ?? null);
      setMatchingImageStatus2('idle');
    } catch {
      setMatchingImageUrl2(null);
      setMatchingImageStatus2('error');
    }
  };

  const handleFindMatchingImage3 = async (englishSentence: string) => {
    setMatchingImageStatus3('loading');

    try {
      const response = await fetch('/api/language/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: englishSentence }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to find an image');
      }

      setMatchingImageUrl3(data.imageUrl ?? null);
      setMatchingImageStatus3('idle');
    } catch {
      setMatchingImageUrl3(null);
      setMatchingImageStatus3('error');
    }
  };

  const handleWritingWordLanguageChange = async (newLanguage: Language) => {
    setWritingWordLanguage(newLanguage);

    if (!vietnameseText.trim()) return;

    try {
      setWritingWordText(await translateText(vietnameseText, 'Vietnamese', newLanguage));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Failed to translate text. Please try again.'
      );
    }
  };

  // Keeps the Writing tab's answer field in sync with its language and with
  // whatever word/sentence was last generated.
  useEffect(() => {
    let isCurrent = true;

    resolveWritingAnswerText(vietnameseText, englishSource, writingAnswerLanguage)
      .then((text) => {
        if (isCurrent) setWritingAnswerText(text);
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
  }, [vietnameseText, englishSource, writingAnswerLanguage]);

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

      // Wait for playback to finish (not just start) so callers can chain
      // audio clips sequentially instead of overlapping them.
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Failed to play audio'));
        };
        audio.play().catch(reject);
      });

      setFriendSpeakStatus('idle');
    } catch (error) {
      setFriendSpeakStatus('error');
      setFriendMessage(
        error instanceof Error ? error.message : 'Failed to play audio. Please try again.'
      );
    }
  };

  const translateFriendReply = async (text: string, toLanguageOverride?: Language) => {
    if (!text.trim()) return;

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          from: friendLanguage,
          to: toLanguageOverride ?? friendInputTranslationLanguage,
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
        body: JSON.stringify({ history: [], difficulty: friendDifficulty, language: friendLanguage }),
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

    const messageText = friendInput;
    const updatedMessages = [...friendMessages, { role: 'user' as const, content: messageText }];
    setFriendMessages(updatedMessages);
    setFriendInput('');
    setFriendInputTranslation('');
    setFriendStatus('loading');
    setFriendMessage('');
    const userMessageSpeech = playFriendSpeech(messageText);

    try {
      const response = await fetch('/api/friend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: updatedMessages,
          difficulty: friendDifficulty,
          language: friendLanguage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get a reply');
      }

      setFriendMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
      setFriendStatus('idle');
      await userMessageSpeech;
      playFriendSpeech(data.reply);
      translateFriendReply(data.reply);
    } catch (error) {
      setFriendStatus('error');
      setFriendMessage(
        error instanceof Error ? error.message : 'Failed to get a reply. Please try again.'
      );
    }
  };

  const handleFriendTranslateInput = async (toLanguageOverride?: Language) => {
    if (!friendInput.trim()) return;

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: friendInput,
          from: friendLanguage,
          to: toLanguageOverride ?? friendInputTranslationLanguage,
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

  const handleFriendInputTranslationLanguageChange = (newLanguage: Language) => {
    setFriendInputTranslationLanguage(newLanguage);
    handleFriendTranslateInput(newLanguage);

    const lastAssistantMessage = [...friendMessages].reverse().find((msg) => msg.role === 'assistant');
    if (lastAssistantMessage) {
      translateFriendReply(lastAssistantMessage.content, newLanguage);
    }
  };

  const isMatch = writingWordText === userInput && userInput.length > 0;

  return (
    <div className="w-full">
      {/* Header Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-100 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 pb-2 bg-gradient-to-r from-powder-600 via-powder-500 to-powder-600 bg-clip-text text-transparent">
            Language
          </h1>
          <p className="text-lg text-slate-600">
            Practice {learnLanguage} with a new sentence built from words you already know.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <label htmlFor="userLanguage" className="text-sm font-medium text-dark-blue">
              I speak
            </label>
            <select
              id="userLanguage"
              name="userLanguage"
              value={userLanguage}
              onChange={(e) => setUserLanguage(e.target.value as Language)}
              className="px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
            >
              {TRANSLATOR_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <label htmlFor="learnLanguage" className="text-sm font-medium text-dark-blue ml-4">
              and want to learn
            </label>
            <select
              id="learnLanguage"
              name="learnLanguage"
              value={learnLanguage}
              onChange={(e) => setLearnLanguage(e.target.value as Language)}
              className="px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
            >
              {TRANSLATOR_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Language Practice Content */}
      <section className="py-16 px-6 sm:px-10 lg:px-16 bg-white flex flex-col items-center">
        <div className="w-full max-w-5xl">
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
            <button
              onClick={() => setActiveTab('matching')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'matching'
                  ? 'text-powder-600 border-powder-600'
                  : 'text-slate-600 border-transparent hover:text-dark-blue'
              }`}
            >
              Matching Game
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
                <LanguageForm answerLanguage={userLanguage} wordLanguage={learnLanguage} />
              </div>
            )}

            {/* Writing Tab */}
            {activeTab === 'writing' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Writing</h2>
                <p className="text-slate-600 mb-8">
                  Translate the {writingWordLanguage} sentence shown below by typing it in the text box.
                </p>

                <div className="space-y-4">
                  {/* Word/Sentence Display */}
                  <div>
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                      <select
                        id="writingWordLanguage"
                        name="writingWordLanguage"
                        value={writingWordLanguage}
                        onChange={(e) => handleWritingWordLanguageChange(e.target.value as Language)}
                        className="px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
                      >
                        {TRANSLATOR_LANGUAGES.map((lang) => (
                          <option key={lang} value={lang}>
                            {lang}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowVietnamese(!showVietnamese)}
                        disabled={status === 'loading' || !writingWordText}
                        className="px-3 py-1 text-sm bg-powder-500 text-white rounded hover:bg-powder-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {showVietnamese ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {showVietnamese ? (
                      <textarea
                        value={writingWordText}
                        readOnly
                        placeholder="Press Get New Sentence to generate one"
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                        rows={3}
                      />
                    ) : (
                      <textarea
                        value={maskText(writingWordText)}
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
                      Type {writingWordLanguage} Here
                    </label>
                    <textarea
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder={`Type your ${writingWordLanguage} translation here`}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                      rows={3}
                    />
                    <div className={`mt-2 text-sm font-semibold ${isMatch ? 'text-green-600' : 'text-red-600'}`}>
                      {isMatch ? 'MATCH' : 'No Match'}
                    </div>
                  </div>

                  {/* Answer Display */}
                  <div>
                    <select
                      id="writingAnswerLanguage"
                      name="writingAnswerLanguage"
                      value={writingAnswerLanguage}
                      onChange={(e) => setWritingAnswerLanguage(e.target.value as Language)}
                      className="mb-2 px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
                    >
                      {TRANSLATOR_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={writingAnswerText}
                      readOnly
                      placeholder="The translation will appear here"
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Difficulty Selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <label htmlFor="complexity" className="block text-sm font-medium text-dark-blue">
                      Difficulty
                    </label>
                    <select
                      id="complexity"
                      value={complexity}
                      onChange={(e) =>
                        setComplexity(
                          e.target.value as 'nouns' | 'verbs' | 'adjectives' | 'easy' | 'medium' | 'hard'
                        )
                      }
                      className="px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
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
                      className="w-full px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
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
                        className="px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex-shrink-0 sm:self-start"
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
                        className="px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex-shrink-0 sm:self-start"
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
                      className="w-full px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
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
                  Chat with a {friendLanguage}-speaking friend who asks you questions using words from your
                  vocabulary notes. Reply in {friendLanguage} in the text box below.
                </p>

                <div className="space-y-4">
                  {/* Language Selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <label htmlFor="friendLanguage" className="block text-sm font-medium text-dark-blue">
                      Language
                    </label>
                    <select
                      id="friendLanguage"
                      value={friendLanguage}
                      onChange={(e) => setFriendLanguage(e.target.value as Language)}
                      className="px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
                    >
                      {TRANSLATOR_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Difficulty Selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <label htmlFor="friendDifficulty" className="block text-sm font-medium text-dark-blue">
                      Difficulty
                    </label>
                    <select
                      id="friendDifficulty"
                      value={friendDifficulty}
                      onChange={(e) => setFriendDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                      className="px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
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
                        className="px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
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
                        className="px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
                      >
                        {showFriendReplyTranslation ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {/* Translation of the chatbot's most recent message */}
                  {showFriendReplyTranslation && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <textarea
                        value={friendReplyTranslation}
                        readOnly
                        placeholder="The translation will appear here"
                        rows={3}
                        className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                      />
                      {/* Invisible spacer matching the chat window's button column so the
                          translation box lines up with the chat window above it. */}
                      <div
                        aria-hidden="true"
                        className="invisible flex flex-row sm:flex-col gap-3 flex-shrink-0"
                      >
                        <button
                          type="button"
                          tabIndex={-1}
                          className="px-4 py-2 font-bold rounded-lg"
                        >
                          Speak
                        </button>
                        <button
                          type="button"
                          tabIndex={-1}
                          className="px-4 py-2 font-bold rounded-lg"
                        >
                          {showFriendReplyTranslation ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
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
                      className="w-full px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
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
                          placeholder={`Type your response in ${friendLanguage}`}
                          rows={2}
                          className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                        />
                        <button
                          type="button"
                          onClick={handleFriendSend}
                          disabled={!friendInput.trim() || friendStatus === 'loading'}
                          className="px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex-shrink-0 sm:self-start"
                        >
                          {friendStatus === 'loading' ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                          ) : (
                            'Send'
                          )}
                        </button>
                      </div>

                      {/* Translation (read-only, updates as you type) */}
                      <div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <select
                            id="friendInputTranslationLanguage"
                            name="friendInputTranslationLanguage"
                            value={friendInputTranslationLanguage}
                            onChange={(e) =>
                              handleFriendInputTranslationLanguageChange(e.target.value as Language)
                            }
                            className="px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
                          >
                            {TRANSLATOR_LANGUAGES.map((lang) => (
                              <option key={lang} value={lang}>
                                {lang}
                              </option>
                            ))}
                          </select>
                          <label htmlFor="friendInputTranslation" className="block text-sm font-medium text-dark-blue">
                            Translation
                          </label>
                        </div>
                        <textarea
                          id="friendInputTranslation"
                          value={friendInputTranslation}
                          readOnly
                          placeholder="The translation will appear here as you type"
                          rows={2}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Matching Game Tab */}
            {activeTab === 'matching' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Matching Game</h2>
                <p className="text-slate-600 mb-8">
                  Match words and their translations to practice your vocabulary.
                </p>

                <div className="space-y-4">
                  {/* Language & Difficulty Selectors */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <label htmlFor="matchingLanguage" className="block text-sm font-medium text-dark-blue">
                      Language
                    </label>
                    <select
                      id="matchingLanguage"
                      name="matchingLanguage"
                      value={matchingLanguage}
                      onChange={(e) => setMatchingLanguage(e.target.value as Language)}
                      className="px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
                    >
                      {TRANSLATOR_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>

                    <label htmlFor="matchingDifficulty" className="block text-sm font-medium text-dark-blue ml-4">
                      Difficulty
                    </label>
                    <select
                      id="matchingDifficulty"
                      name="matchingDifficulty"
                      value={matchingDifficulty}
                      onChange={(e) =>
                        setMatchingDifficulty(
                          e.target.value as 'nouns' | 'verbs' | 'adjectives' | 'easy' | 'medium' | 'hard'
                        )
                      }
                      className="px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
                    >
                      <option value="nouns">Noun/Verb/Adjective</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {/* Generate Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleGenerateMatchingSentence}
                      disabled={matchingStatus === 'loading'}
                      className="w-full px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
                    >
                      {matchingStatus === 'loading' ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Generating...
                        </span>
                      ) : (
                        'Generate'
                      )}
                    </button>
                  </div>

                  {/* Sentences/Translations (left) and Images (right) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Sentences, Translations & Show buttons */}
                    <div className="space-y-4">
                      {/* Generated Sentence Display */}
                      <div>
                        <label className="block text-sm font-medium text-dark-blue mb-2">Sentence 1</label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <textarea
                            value={matchingSentence}
                            readOnly
                            placeholder="Press Generate to create a random sentence"
                            className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                            rows={2}
                          />
                          <div className="flex flex-row sm:flex-col gap-3 flex-shrink-0 sm:self-end">
                            <button
                              type="button"
                              onClick={handleToggleMatchingTranslation}
                              disabled={!matchingSentence}
                              className="px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
                            >
                              {showMatchingTranslation ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Translation of the generated sentence */}
                      {showMatchingTranslation && (
                        <div>
                          <label className="block text-sm font-medium text-dark-blue mb-2">Translation</label>
                          <textarea
                            value={matchingTranslation}
                            readOnly
                            placeholder="The translation will appear here"
                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                            rows={2}
                          />
                        </div>
                      )}

                      {/* Generated Sentence 2 Display */}
                      <div>
                        <label className="block text-sm font-medium text-dark-blue mb-2">Sentence 2</label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <textarea
                            value={matchingSentence2}
                            readOnly
                            placeholder="Press Generate to create a random sentence"
                            className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                            rows={2}
                          />
                          <div className="flex flex-row sm:flex-col gap-3 flex-shrink-0 sm:self-end">
                            <button
                              type="button"
                              onClick={handleToggleMatchingTranslation2}
                              disabled={!matchingSentence2}
                              className="px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
                            >
                              {showMatchingTranslation2 ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Translation of the second generated sentence */}
                      {showMatchingTranslation2 && (
                        <div>
                          <label className="block text-sm font-medium text-dark-blue mb-2">Translation</label>
                          <textarea
                            value={matchingTranslation2}
                            readOnly
                            placeholder="The translation will appear here"
                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                            rows={2}
                          />
                        </div>
                      )}

                      {/* Generated Sentence 3 Display */}
                      <div>
                        <label className="block text-sm font-medium text-dark-blue mb-2">Sentence 3</label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <textarea
                            value={matchingSentence3}
                            readOnly
                            placeholder="Press Generate to create a random sentence"
                            className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                            rows={2}
                          />
                          <div className="flex flex-row sm:flex-col gap-3 flex-shrink-0 sm:self-end">
                            <button
                              type="button"
                              onClick={handleToggleMatchingTranslation3}
                              disabled={!matchingSentence3}
                              className="px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
                            >
                              {showMatchingTranslation3 ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Translation of the third generated sentence */}
                      {showMatchingTranslation3 && (
                        <div>
                          <label className="block text-sm font-medium text-dark-blue mb-2">Translation</label>
                          <textarea
                            value={matchingTranslation3}
                            readOnly
                            placeholder="The translation will appear here"
                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors resize-none"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>

                    {/* Right: Images */}
                    <div className="space-y-4">
                      {/* Matching Image Display */}
                      <div>
                        <label className="block text-sm font-medium text-dark-blue mb-2">Image 1</label>
                        <div className="w-full max-w-[200px] mx-auto min-h-[8rem] flex items-center justify-center p-3 rounded-lg bg-white border border-slate-300 overflow-hidden">
                          {matchingImageStatus === 'loading' ? (
                            <span className="flex items-center gap-2 text-slate-400 text-sm">
                              <span className="w-4 h-4 border-2 border-powder-500 border-t-transparent rounded-full animate-spin"></span>
                              Finding an image...
                            </span>
                          ) : matchingImageUrl ? (
                            <Image
                              src={matchingImageUrl}
                              alt={matchingSentence || 'Image matching the generated sentence'}
                              width={267}
                              height={200}
                              unoptimized
                              className="max-w-full max-h-32 w-auto h-auto object-contain rounded-lg"
                            />
                          ) : matchingImageStatus === 'error' ? (
                            <span className="text-slate-400 text-sm">Could not find an image for this sentence.</span>
                          ) : (
                            <span className="text-slate-400 text-sm">
                              An image matching the sentence will appear here.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Matching Image 2 Display */}
                      <div>
                        <label className="block text-sm font-medium text-dark-blue mb-2">Image 2</label>
                        <div className="w-full max-w-[200px] mx-auto min-h-[8rem] flex items-center justify-center p-3 rounded-lg bg-white border border-slate-300 overflow-hidden">
                          {matchingImageStatus2 === 'loading' ? (
                            <span className="flex items-center gap-2 text-slate-400 text-sm">
                              <span className="w-4 h-4 border-2 border-powder-500 border-t-transparent rounded-full animate-spin"></span>
                              Finding an image...
                            </span>
                          ) : matchingImageUrl2 ? (
                            <Image
                              src={matchingImageUrl2}
                              alt={matchingSentence2 || 'Image matching the generated sentence'}
                              width={267}
                              height={200}
                              unoptimized
                              className="max-w-full max-h-32 w-auto h-auto object-contain rounded-lg"
                            />
                          ) : matchingImageStatus2 === 'error' ? (
                            <span className="text-slate-400 text-sm">Could not find an image for this sentence.</span>
                          ) : (
                            <span className="text-slate-400 text-sm">
                              An image matching the sentence will appear here.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Matching Image 3 Display */}
                      <div>
                        <label className="block text-sm font-medium text-dark-blue mb-2">Image 3</label>
                        <div className="w-full max-w-[200px] mx-auto min-h-[8rem] flex items-center justify-center p-3 rounded-lg bg-white border border-slate-300 overflow-hidden">
                          {matchingImageStatus3 === 'loading' ? (
                            <span className="flex items-center gap-2 text-slate-400 text-sm">
                              <span className="w-4 h-4 border-2 border-powder-500 border-t-transparent rounded-full animate-spin"></span>
                              Finding an image...
                            </span>
                          ) : matchingImageUrl3 ? (
                            <Image
                              src={matchingImageUrl3}
                              alt={matchingSentence3 || 'Image matching the generated sentence'}
                              width={267}
                              height={200}
                              unoptimized
                              className="max-w-full max-h-32 w-auto h-auto object-contain rounded-lg"
                            />
                          ) : matchingImageStatus3 === 'error' ? (
                            <span className="text-slate-400 text-sm">Could not find an image for this sentence.</span>
                          ) : (
                            <span className="text-slate-400 text-sm">
                              An image matching the sentence will appear here.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Message */}
                  {matchingMessage && (
                    <div className="p-3 rounded-lg text-sm bg-red-100 text-red-700">
                      {matchingMessage}
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
