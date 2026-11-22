import { NextResponse } from 'next/server';
import { getClientIp, isRateLimited, MINUTE, tooManyRequests } from '@/lib/rateLimit';
import { createSession } from '@/lib/session';
import { authenticateUser } from '@/lib/users';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const emailAddress = typeof body.emailAddress === 'string' ? body.emailAddress.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!emailAddress || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    // Slows password guessing: per visitor, and per account so guesses spread
    // over many IPs still hit a ceiling.
    if (
      await isRateLimited([
        { key: `login:ip:${getClientIp(request)}`, limit: 20, windowMs: 15 * MINUTE },
        { key: `login:email:${emailAddress}`, limit: 30, windowMs: 15 * MINUTE },
      ])
    ) {
      return tooManyRequests('Too many login attempts. Please wait a few minutes and try again.');
    }

    const user = await authenticateUser(emailAddress, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    // Only said to someone who knows the password, so it doesn't reveal who has an account
    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error: 'Please verify your email address before logging in. Check your inbox for the link we sent you.',
          verificationRequired: true,
        },
        { status: 403 }
      );
    }

    await createSession(user.id);
    return NextResponse.json({ user: { userName: user.userName } });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Failed to log in' }, { status: 500 });
  }
}
