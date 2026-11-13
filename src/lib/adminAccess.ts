import { NextResponse } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { isAiLockedDown } from './aiLockdown';
import { isAdmin } from './roles';
import { getCurrentUser } from './session';
import type { User } from './users';

// The Sandbox and Admin pages, and every AI feature on the site, are for
// Admins only (clarivex."Users".role). Access is decided from the signed-in
// session on the server, so hiding a nav link is never the only protection and
// a bot without an Admin's session cookie can't reach any of it.

// For API routes: returns the error response to send back, or null when an Admin is signed in.
//   const denied = await requireAdmin();
//   if (denied) return denied;
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Log in to use this feature' }, { status: 401 });
  if (!isAdmin(user.role)) {
    return NextResponse.json({ error: 'This feature is not available for your account' }, { status: 403 });
  }
  return null;
}

// For every API route that runs an AI model (or a script that does): Admins
// only, and nobody at all while the Admin page's emergency lockdown is on.
// If the lockdown can't be read, the route stays closed.
export async function requireAi(): Promise<NextResponse | null> {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    if (!(await isAiLockedDown())) return null;
  } catch (error) {
    console.error('AI lockdown check failed:', error);
  }
  return NextResponse.json(
    { error: 'AI features are locked down. An Admin can turn them back on from the Admin page.' },
    { status: 503 }
  );
}

// For server-component pages: sends visitors who are not signed in to the login page and shows a 404
// to everyone else who is not an Admin. Call it first in the page.
export async function requireAdminPage(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isAdmin(user.role)) notFound();
  return user;
}
