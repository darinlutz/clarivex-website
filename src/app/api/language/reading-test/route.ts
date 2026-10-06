import { NextResponse } from 'next/server';
import type { Language } from '@/lib/translate';
import {
  generateReadingTest,
  MAX_READING_TEST_DIFFICULTY,
  MIN_READING_TEST_DIFFICULTY,
} from '@/lib/readingTest';

const VALID_LANGUAGES: Language[] = ['Arabic', 'English', 'German', 'Japanese', 'Vietnamese'];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const learnLanguage: Language = VALID_LANGUAGES.includes(body.learnLanguage)
      ? body.learnLanguage
      : 'Vietnamese';
    const userLanguage: Language = VALID_LANGUAGES.includes(body.userLanguage)
      ? body.userLanguage
      : 'English';
    const difficulty = Number(body.difficulty);

    if (
      !Number.isInteger(difficulty) ||
      difficulty < MIN_READING_TEST_DIFFICULTY ||
      difficulty > MAX_READING_TEST_DIFFICULTY
    ) {
      return NextResponse.json(
        { error: `Difficulty must be a whole number from ${MIN_READING_TEST_DIFFICULTY} to ${MAX_READING_TEST_DIFFICULTY}` },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const avoid = Array.isArray(body.avoid)
      ? body.avoid.filter((s: unknown): s is string => typeof s === 'string').slice(-20)
      : [];

    const test = await generateReadingTest(learnLanguage, userLanguage, difficulty, avoid);

    return NextResponse.json({ success: true, ...test }, { status: 200 });
  } catch (error) {
    console.error('Reading test error:', error);
    return NextResponse.json({ error: 'Failed to generate a reading test' }, { status: 500 });
  }
}
