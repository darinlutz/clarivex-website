import { NextResponse } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from './session';
import { isOwnerEmail } from './users';

// Jira, Trip Planner, Trends and Racing (and the API routes behind them) are only for the site owner.

// For API routes: returns the error response to send back, or null when the owner is signed in.
//   const denied = await requireOwner();
//   if (denied) return denied;
export async function requireOwner(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Log in to use this feature' }, { status: 401 });
  if (!isOwnerEmail(user.emailAddress)) {
    return NextResponse.json({ error: 'This feature is not available for your account' }, { status: 403 });
  }
  return null;
}

// For server-component pages: sends visitors who are not signed in to the login page and shows a 404
// to everyone else who is not the owner. Call it first in the page.
export async function requireOwnerPage(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isOwnerEmail(user.emailAddress)) notFound();
}
