import { NextResponse } from 'next/server';
import { getTopTrends } from '@/lib/trends';
import { requireOwner } from '@/lib/ownerAccess';

export async function POST(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => ({}));
    // Optional region/topic to narrow the trends, e.g. "Germany" or "sports"
    const focus = typeof body.focus === 'string' ? body.focus.slice(0, 500) : '';

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const result = await getTopTrends(focus);

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    console.error('Trends error:', error);
    return NextResponse.json({ error: 'Failed to look up trends' }, { status: 500 });
  }
}
