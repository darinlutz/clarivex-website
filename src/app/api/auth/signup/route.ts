import { NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/emailVerification';
import { clientIp, tooManyAttempts } from '@/lib/rateLimit';
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
    if (tooManyAttempts(`signup-ip:${clientIp(request)}`, { max: 5, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json({ error: 'Too many sign-ups. Please try again later.' }, { status: 429 });
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
