import { NextResponse } from 'next/server';
import { getRandomSentence } from '@/lib/language';

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const sentence = await getRandomSentence();

    return NextResponse.json({ success: true, ...sentence }, { status: 200 });
  } catch (error) {
    console.error('Language practice error:', error);

    return NextResponse.json(
      { error: 'Failed to generate a new sentence' },
      { status: 500 }
    );
  }
}
