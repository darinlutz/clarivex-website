import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { isLanguage } from '@/lib/languages';
import { setLanguagePreferences } from '@/lib/users';

// Saves the Language page's "want to learn" (activeLearningLanguage) and/or
// "I speak" (nativeLanguage) picks for the signed-in user
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { activeLearningLanguage, nativeLanguage } = body;

    if (activeLearningLanguage === undefined && nativeLanguage === undefined) {
      return NextResponse.json({ error: 'No language to save' }, { status: 400 });
    }
    if (
      (activeLearningLanguage !== undefined && !isLanguage(activeLearningLanguage)) ||
      (nativeLanguage !== undefined && !isLanguage(nativeLanguage))
    ) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    await setLanguagePreferences(user.id, { activeLearningLanguage, nativeLanguage });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save languages error:', error);
    return NextResponse.json({ error: 'Failed to save your languages' }, { status: 500 });
  }
}
