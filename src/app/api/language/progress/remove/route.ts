import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { getSiteOrigin } from '@/lib/siteOrigin';
import { isLanguage } from '@/lib/languages';
import { removeLanguage } from '@/lib/languageProgress';

// The Account page's Delete button (a form post): removes a language that's
// still at Level 0, then returns to the Account page
export async function POST(request: Request) {
  try {
    const origin = getSiteOrigin(request);

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(`${origin}/login`, 303);
    }

    const language = (await request.formData()).get('language');
    if (!isLanguage(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    if (!(await removeLanguage(user.id, language))) {
      return NextResponse.json(
        { error: 'Only languages at Level 0 can be deleted' },
        { status: 400 }
      );
    }

    return NextResponse.redirect(`${origin}/account`, 303);
  } catch (error) {
    console.error('Remove language error:', error);
    return NextResponse.json({ error: 'Failed to delete language' }, { status: 500 });
  }
}
