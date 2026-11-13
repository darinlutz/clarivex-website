import { NextResponse } from 'next/server';
import { clientIp, tooManyAttempts } from '@/lib/rateLimit';
import { createSession } from '@/lib/session';
import { authenticateUser } from '@/lib/users';

// At most 10 attempts per email address, and 30 per IP address, every 15
// minutes, so a bot can't guess its way into an account.
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const emailAddress = typeof body.emailAddress === 'string' ? body.emailAddress.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!emailAddress || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (
      tooManyAttempts(`login:${emailAddress}`, { max: 10, windowMs: WINDOW_MS }) ||
      tooManyAttempts(`login-ip:${clientIp(request)}`, { max: 30, windowMs: WINDOW_MS })
    ) {
      return NextResponse.json({ error: 'Too many login attempts. Please try again in 15 minutes.' }, { status: 429 });
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
