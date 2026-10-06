// Client-side helpers for the Language test/training tabs: synthesized
// chime/error sounds (so no audio files are needed), text-to-speech
// playback, the Difficulty scale and fetching practice items. Browser-only.

import type { Language } from '@/lib/translate';
import type { WordCategory } from '@/lib/language';
import type { AlignedSegment } from '@/lib/wordAlignment';

export const TEST_LANGUAGES: Language[] = ['Arabic', 'English', 'German', 'Japanese', 'Vietnamese'];

export const WORD_CATEGORIES: { value: WordCategory; label: string }[] = [
  { value: 'activities', label: 'Activities' },
  { value: 'adjectives', label: 'Adjectives' },
  { value: 'classifiers', label: 'Classifiers' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'colors', label: 'Colors' },
  { value: 'conjunctionsPrepositions', label: 'Conjunctions & Prepositions' },
  { value: 'focus', label: 'Focus' },
  { value: 'foodDrink', label: 'Food & Drink' },
  { value: 'houseHome', label: 'House & Home' },
  { value: 'numbers', label: 'Numbers & Money' },
  { value: 'peopleAnimals', label: 'People & Animals' },
  { value: 'places', label: 'Places' },
  { value: 'pronouns', label: 'Pronouns' },
  { value: 'things', label: 'Things' },
  { value: 'timeRelated', label: 'Time Related' },
  { value: 'verbs', label: 'Verbs' },
];

// "words" and "fastPhrases" come from the vocabulary sheet; "1"-"10" are
// generated sentences on the Reading Test's 1-10 scale.
export type TestDifficulty = 'fastPhrases' | 'words' | `${number}`;

// The vocabulary sheet category a Difficulty draws from, or null for
// generated sentences.
export function vocabCategoryFor(difficulty: TestDifficulty, wordCategory: WordCategory): WordCategory | null {
  if (difficulty === 'words') return wordCategory;
  if (difficulty === 'fastPhrases') return 'fastPhrases';
  return null;
}

// A word/phrase/sentence in every language it's known in so far. `source`
// is the language other translations are made from.
export type TestItem = {
  id: number;
  texts: Partial<Record<Language, string>>;
  source: Language;
};

// Session memory so the same words/sentences don't keep coming up
export type TestHistory = {
  usedWordsByCategory: Partial<Record<WordCategory, string[]>>;
  recentSentences: string[];
};

export async function translateText(text: string, from: Language, to: Language): Promise<string> {
  if (!text.trim() || from === to) return text;

  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, from, to }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to translate text');
  }

  return data.translation;
}

// Fills in the item's text for each of the given languages it doesn't have yet
export async function withLanguages(item: TestItem, languages: Language[]): Promise<TestItem> {
  const sourceText = item.texts[item.source] ?? '';
  const missing = Array.from(new Set(languages)).filter((lang) => item.texts[lang] === undefined);
  const translated = await Promise.all(
    missing.map(async (lang) => [lang, await translateText(sourceText, item.source, lang)] as const)
  );
  return { ...item, texts: { ...item.texts, ...Object.fromEntries(translated) } };
}

// Gets a new item from the vocabulary sheet or, for 1-10, a generated
// sentence, and records it in `history`.
export async function fetchTestItem(
  id: number,
  difficulty: TestDifficulty,
  wordCategory: WordCategory,
  learnLanguage: Language,
  userLanguage: Language,
  history: TestHistory
): Promise<TestItem> {
  const vocabCategory = vocabCategoryFor(difficulty, wordCategory);

  if (vocabCategory) {
    const response = await fetch('/api/language/word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: vocabCategory,
        usedWords: history.usedWordsByCategory[vocabCategory] ?? [],
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get a new word');
    }

    history.usedWordsByCategory[vocabCategory] = [
      ...(history.usedWordsByCategory[vocabCategory] ?? []),
      data.vietnamese,
    ].slice(-100);
    // The vocabulary is Vietnamese/English; other languages are translated
    // from the English.
    return { id, texts: { Vietnamese: data.vietnamese, English: data.english }, source: 'English' };
  }

  const response = await fetch('/api/language/writing-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      learnLanguage,
      userLanguage,
      difficulty: Number(difficulty),
      avoid: history.recentSentences,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate a sentence');
  }

  history.recentSentences = [...history.recentSentences, data.sentence].slice(-20);
  return {
    id,
    texts: { [userLanguage]: data.translation, [learnLanguage]: data.sentence },
    source: learnLanguage,
  };
}

// Pairs up the words of a text and its translation for coloring, or null if
// that fails (the text is then shown uncolored).
export async function alignTexts(
  sentence: string,
  from: Language,
  translation: string,
  to: Language
): Promise<{ sentenceSegments: AlignedSegment[]; translationSegments: AlignedSegment[] } | null> {
  if (!sentence.trim() || !translation.trim() || from === to) return null;

  try {
    const response = await fetch('/api/language/align', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence, from, translation, to }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return { sentenceSegments: data.sentenceSegments, translationSegments: data.translationSegments };
  } catch {
    return null;
  }
}

function playTones(
  tones: { frequency: number; start: number; duration: number }[],
  type: OscillatorType
) {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  let end = 0;
  for (const { frequency, start, duration } of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    const t0 = ctx.currentTime + start;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration);
    end = Math.max(end, start + duration);
  }
  setTimeout(() => ctx.close(), (end + 0.1) * 1000);
}

export const playChime = () =>
  playTones(
    [
      { frequency: 880, start: 0, duration: 0.35 },
      { frequency: 1318.5, start: 0.12, duration: 0.5 },
    ],
    'sine'
  );

export const playError = () =>
  playTones(
    [
      { frequency: 196, start: 0, duration: 0.18 },
      { frequency: 156, start: 0.16, duration: 0.3 },
    ],
    'square'
  );

export const MALE_VOICE = 'alloy';
export const FEMALE_VOICE = 'nova';

// Speaks text through /api/speak and resolves once playback starts
export async function speakText(text: string, voice: string): Promise<void> {
  const response = await fetch('/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to generate speech');
  }

  const audioUrl = URL.createObjectURL(await response.blob());
  const audio = new Audio(audioUrl);
  audio.onended = () => URL.revokeObjectURL(audioUrl);
  await audio.play();
}

// The 1-10 sentence Difficulty scale shared by the test tabs
export const DIFFICULTY_LEVELS = Array.from({ length: 10 }, (_, i) => i + 1);

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Very Easy',
  3: 'Easy',
  5: 'Medium',
  10: 'Very Hard',
};

export const difficultyOptionLabel = (level: number) =>
  DIFFICULTY_LABELS[level] ? `${level} - ${DIFFICULTY_LABELS[level]}` : String(level);
