import { NextResponse } from 'next/server';
import { getRandomSentence, type Difficulty } from '@/lib/language';

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const complexity: Difficulty = VALID_DIFFICULTIES.includes(body.complexity)
      ? body.complexity
      : 'easy';
    const usedWords: string[] = Array.isArray(body.usedWords) ? body.usedWords : [];
    const usedSentences: string[] = Array.isArray(body.usedSentences) ? body.usedSentences : [];

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const sentence = await getRandomSentence(complexity, usedWords, usedSentences);

    return NextResponse.json({ success: true, ...sentence }, { status: 200 });
  } catch (error) {
    console.error('Language practice error:', error);

    return NextResponse.json(
      { error: 'Failed to generate a new sentence' },
      { status: 500 }
    );
  }
}
