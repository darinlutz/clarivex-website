import { NextResponse } from 'next/server';
import { getRandomWord, VALID_WORD_CATEGORIES, type WordCategory } from '@/lib/language';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const category: WordCategory = VALID_WORD_CATEGORIES.includes(body.category)
      ? body.category
      : 'all';
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
