import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { isLanguage } from '@/lib/languages';
import { startLanguage } from '@/lib/languageProgress';

// Adds the language picked in the Language page's "want to learn" combobox
// to the signed-in user's profile at Level 0
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (!isLanguage(body.language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    return NextResponse.json({ progress: await startLanguage(user.id, body.language) });
  } catch (error) {
    console.error('Start language error:', error);
    return NextResponse.json({ error: 'Failed to add language' }, { status: 500 });
  }
}
