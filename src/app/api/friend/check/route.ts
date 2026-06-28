import { NextResponse } from 'next/server';
import { checkGrammar } from '@/lib/grammarCheck';
import type { Language } from '@/lib/translate';

const VALID_LANGUAGES: Language[] = ['Arabic', 'English', 'German', 'Japanese', 'Vietnamese'];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = body.text;
    const language: Language = VALID_LANGUAGES.includes(body.language) ? body.language : 'Vietnamese';

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Missing text to check' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const tokens = await checkGrammar(text, language);

    return NextResponse.json({ success: true, tokens }, { status: 200 });
  } catch (error) {
    console.error('Grammar check error:', error);

    return NextResponse.json(
      { error: 'Failed to check grammar' },
      { status: 500 }
    );
  }
}
