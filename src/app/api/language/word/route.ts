import { NextResponse } from 'next/server';
import { getRandomWord } from '@/lib/language';

type WordCategory = 'nouns' | 'verbs' | 'adjectives';
const VALID_CATEGORIES: WordCategory[] = ['nouns', 'verbs', 'adjectives'];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const category: WordCategory = VALID_CATEGORIES.includes(body.category)
      ? body.category
      : 'nouns';

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const word = await getRandomWord(category);

    return NextResponse.json({ success: true, ...word }, { status: 200 });
  } catch (error) {
    console.error('Word generation error:', error);

    return NextResponse.json(
      { error: 'Failed to generate a new word' },
      { status: 500 }
    );
  }
}
