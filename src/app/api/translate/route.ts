import { NextResponse } from 'next/server';
import { translateToEnglish } from '@/lib/translate';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = body.text;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Missing text to translate' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const english = await translateToEnglish(text);

    return NextResponse.json({ success: true, english }, { status: 200 });
  } catch (error) {
    console.error('Translate error:', error);

    return NextResponse.json(
      { error: 'Failed to translate text' },
      { status: 500 }
    );
  }
}
