import { NextResponse } from 'next/server';
import { getAiLockdown, setAiLockdown } from '@/lib/aiLockdown';
import { isAdmin } from '@/lib/roles';
import { getCurrentUser } from '@/lib/session';

// The Admin page's emergency AI lockdown switch (src/lib/aiLockdown.ts). Admins only.
// GET: the current state. POST { locked: boolean }: switches it.
async function adminOrDenied() {
  const user = await getCurrentUser();
  if (!user) return { denied: NextResponse.json({ error: 'Log in to use this feature' }, { status: 401 }) };
  if (!isAdmin(user.role)) {
    return { denied: NextResponse.json({ error: 'Only admins can change the AI lockdown' }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const { denied } = await adminOrDenied();
  if (denied) return denied;
  try {
    return NextResponse.json(await getAiLockdown());
  } catch (error) {
    console.error('AI lockdown read error:', error);
    return NextResponse.json({ error: 'Failed to read the AI lockdown' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { denied, user } = await adminOrDenied();
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.locked !== 'boolean') {
      return NextResponse.json({ error: 'locked must be true or false' }, { status: 400 });
    }
    return NextResponse.json(await setAiLockdown(body.locked, user.id));
  } catch (error) {
    console.error('AI lockdown change error:', error);
    return NextResponse.json({ error: 'Failed to change the AI lockdown' }, { status: 500 });
  }
}
