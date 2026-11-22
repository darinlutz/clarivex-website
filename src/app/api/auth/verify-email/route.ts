import { NextResponse } from 'next/server';
import { sendVerificationEmail, verifyEmailToken } from '@/lib/emailVerification';
import { DAY, getClientIp, HOUR, isRateLimited, tooManyRequests } from '@/lib/rateLimit';
import { getPublicSiteUrl } from '@/lib/siteOrigin';
import { getUserByEmail } from '@/lib/users';

// Email address verification (src/lib/emailVerification.ts).
// GET ?token=: the link in the email. Verifies the address and goes to the
// Log In page, which says whether it worked (?emailVerified=1 or =invalid).
// POST { emailAddress }: the sign-up and log-in forms' Resend button. Always
// answers the same way, so it can't be used to find out who has an account.
export async function GET(request: Request) {
  const siteUrl = getPublicSiteUrl(request);
  try {
    const token = new URL(request.url).searchParams.get('token') ?? '';
    const verified = await verifyEmailToken(token);
    return NextResponse.redirect(`${siteUrl}/login?emailVerified=${verified ? '1' : 'invalid'}`, 303);
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(`${siteUrl}/login?emailVerified=invalid`, 303);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const emailAddress = typeof body.emailAddress === 'string' ? body.emailAddress.trim().toLowerCase() : '';
    if (!emailAddress) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    // Caps per address, per visitor and site-wide, so inboxes can't be flooded
    // and the Resend quota can't be drained.
    if (
      await isRateLimited([
        { key: `verify:email:${emailAddress}`, limit: 5, windowMs: HOUR },
        { key: `verify:ip:${getClientIp(request)}`, limit: 20, windowMs: HOUR },
        { key: 'verify:global', limit: 200, windowMs: DAY },
      ])
    ) {
      return tooManyRequests();
    }

    const user = await getUserByEmail(emailAddress);
    if (user && !user.emailVerified) {
      const sent = await sendVerificationEmail(user, getPublicSiteUrl(request));
      if (!sent) {
        return NextResponse.json({ error: 'Failed to send the verification email' }, { status: 502 });
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend verification email error:', error);
    return NextResponse.json({ error: 'Failed to send the verification email' }, { status: 500 });
  }
}
