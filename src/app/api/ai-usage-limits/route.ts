import { NextResponse } from 'next/server';
import { getOpenAIUsage } from '@/lib/openaiUsage';
import { isAdmin } from '@/lib/roles';
import { getCurrentUser } from '@/lib/session';

// Lists the OpenAI API keys and this month's spend for the Trends page's AI Usage Limits tab. Admins only.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Log in to see AI usage' }, { status: 401 });
  }
  if (!isAdmin(user.role)) {
    return NextResponse.json({ error: 'Only admins can see AI usage' }, { status: 403 });
  }

  const adminKey = process.env.OPENAI_ADMIN_KEY;
  if (!adminKey) {
    console.error('OPENAI_ADMIN_KEY is not configured');
    return NextResponse.json({ error: 'OpenAI Admin key (OPENAI_ADMIN_KEY) not configured' }, { status: 500 });
  }

  try {
    return NextResponse.json(await getOpenAIUsage(adminKey));
  } catch (error) {
    console.error('AI usage error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load AI usage';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
