import { NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/emailVerification';
import { DAY, getClientIp, HOUR, isRateLimited, tooManyRequests } from '@/lib/rateLimit';
import { getPublicSiteUrl } from '@/lib/siteOrigin';
import { createUser, EmailTakenError } from '@/lib/users';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;

// Creates an account and emails its verification link. The new user is not
// signed in: they can log in once they have opened the link
// (src/lib/emailVerification.ts). At most 5 accounts an hour per IP address.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userName = typeof body.userName === 'string' ? body.userName.trim() : '';
    const emailAddress = typeof body.emailAddress === 'string' ? body.emailAddress.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!userName || !emailAddress || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (userName.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Name must be at most ${MAX_NAME_LENGTH} characters` }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(emailAddress)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (userName.length > 100 || emailAddress.length > 254 || password.length > 200) {
      return NextResponse.json({ error: 'One or more fields are too long' }, { status: 400 });
    }

    // Keeps bots from mass-creating accounts
    if (
      await isRateLimited([
        { key: `signup:ip:${getClientIp(request)}`, limit: 5, windowMs: HOUR },
        { key: 'signup:global', limit: 200, windowMs: DAY },
      ])
    ) {
      return tooManyRequests('Too many accounts created. Please try again later.');
    }

    const user = await createUser({ userName, emailAddress, password });
    // A failed send isn't the sign-up's failure; the form's Resend button sends another
    const emailSent = await sendVerificationEmail(user, getPublicSiteUrl(request)).catch((error) => {
      console.error('Verification email error:', error);
      return false;
    });
    return NextResponse.json({ verificationRequired: true, emailSent }, { status: 201 });
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
