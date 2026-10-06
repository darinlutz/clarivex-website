'use client';

// Hooks the Language page's Training/Reading Test/Writing Test tabs share
// for belt progress.
import { useState } from 'react';
import type { Language } from '@/lib/languages';
import {
  startingProgress,
  type LanguageActivity,
  type LanguageProgress,
  type RecordedActivity,
} from '@/lib/languageLevels';
import { recordLanguageResult, type ProgressMap } from '@/lib/languageTestClient';
import type { ProgressOutcome } from '@/components/ProgressUpdate';

// The user's progress in `language`, or null when signed out
export function progressFor(progressByLanguage: ProgressMap | null, language: Language): LanguageProgress | null {
  if (!progressByLanguage) return null;
  return progressByLanguage[language] ?? startingProgress(language);
}

// Sets the tab's Difficulty to the level being worked on whenever that
// level (or the language) changes, while still letting the user pick
// another Difficulty for practice.
export function useWorkingLevelDefault(progress: LanguageProgress | null, apply: (level: number) => void) {
  const key = progress?.workingLevel ? `${progress.language}|${progress.workingLevel}` : '';
  const [appliedKey, setAppliedKey] = useState('');
  if (key !== appliedKey) {
    setAppliedKey(key);
    if (progress?.workingLevel) apply(progress.workingLevel);
  }
}

// Saves a finished Training/test and reports what it meant for the user's
// progress (shown with <ProgressUpdate>).
export function useProgressRecorder(onRecorded: (result: RecordedActivity) => void) {
  const [outcome, setOutcome] = useState<ProgressOutcome | null>(null);

  const record = async (input: {
    language: Language;
    level: number | null;
    activity: LanguageActivity;
    score?: number;
  }) => {
    setOutcome('saving');
    try {
      const result = await recordLanguageResult(input);
      setOutcome(result);
      if (result !== 'signedOut') onRecorded(result);
    } catch (error) {
      setOutcome({ error: error instanceof Error ? error.message : 'Failed to save your progress' });
    }
  };

  return { outcome, record, clear: () => setOutcome(null) };
}
