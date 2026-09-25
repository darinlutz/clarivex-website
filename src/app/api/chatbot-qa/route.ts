import { NextResponse } from 'next/server';
import { runPythonJson } from '@/lib/ragRoute';

// The first question after a fresh install scrapes and embeds the source
// pages (several minutes); later questions reuse the saved vector store.
const TIMEOUT_MS = 15 * 60 * 1000;

interface QaResult {
  answer?: string;
  sources?: string[];
  error?: string;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!message) {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 });
  }

  try {
    const result = await runPythonJson<QaResult>('chatbot_qa.py', { message }, TIMEOUT_MS);

    if (!result.answer) {
      return NextResponse.json({ error: 'Chatbot returned no answer' }, { status: 500 });
    }

    return NextResponse.json({ answer: result.answer, sources: result.sources ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chatbot Q&A failed' },
      { status: 500 }
    );
  }
}
