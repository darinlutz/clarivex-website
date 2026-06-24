import { NextResponse } from 'next/server';
import { getRandomWord, type WordCategory } from '@/lib/language';

const VALID_CATEGORIES: WordCategory[] = ['nouns', 'verbs', 'adjectives'];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const category: WordCategory = VALID_CATEGORIES.includes(body.category)
      ? body.category
      : 'nouns';
    const usedWords: string[] = Array.isArray(body.usedWords) ? body.usedWords : [];

    const word = await getRandomWord(category, usedWords);

    return NextResponse.json({ success: true, ...word }, { status: 200 });
  } catch (error) {
    console.error('Word generation error:', error);

    return NextResponse.json(
      { error: 'Failed to generate a new word' },
      { status: 500 }
    );
  }
}
