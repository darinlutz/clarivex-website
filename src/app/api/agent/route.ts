import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const instructions = typeof body.instructions === 'string' ? body.instructions.trim() : '';

    if (!instructions) {
      return NextResponse.json({ error: 'Missing instructions' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    if (!process.env.TAVILY_API_KEY) {
      console.error('TAVILY_API_KEY is not configured');
      return NextResponse.json({ error: 'Tavily API key not configured' }, { status: 500 });
    }

    const output = await runAgent(instructions);

    return NextResponse.json({ success: true, output }, { status: 200 });
  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json({ error: 'Failed to run the agent' }, { status: 500 });
  }
}
