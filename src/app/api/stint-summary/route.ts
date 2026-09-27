import { NextResponse } from 'next/server';
import { summarizeStint } from '@/lib/lapSummary';

// Stint statistics for one track are a few KB; anything much bigger isn't a stint
const MAX_STATS_CHARS = 20000;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const stats = body.stats;
    const track = typeof body.track === 'string' && body.track.trim() ? body.track.trim() : 'the track';

    if (!stats || typeof stats !== 'string' || !stats.trim()) {
      return NextResponse.json({ error: 'Missing stint statistics to analyze' }, { status: 400 });
    }
    if (stats.length > MAX_STATS_CHARS) {
      return NextResponse.json({ error: 'Stint statistics are too long to analyze' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const summary = await summarizeStint(stats, track);

    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (error) {
    console.error('Stint summary error:', error);
    return NextResponse.json({ error: 'Failed to analyze the stint' }, { status: 500 });
  }
}
