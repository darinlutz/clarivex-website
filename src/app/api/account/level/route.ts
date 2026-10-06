import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';

// The signed-in user's level, for client pages (e.g. the Language page's
// Training tab).
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }
    return NextResponse.json({ level: user.level });
  } catch (error) {
    console.error('Level lookup error:', error);
    return NextResponse.json({ error: 'Failed to look up level' }, { status: 500 });
  }
}
