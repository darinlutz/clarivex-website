import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { createPasswordResetToken } from '@/lib/passwordReset';
import { clientIp, tooManyAttempts } from '@/lib/rateLimit';
import { getPublicSiteUrl } from '@/lib/siteOrigin';
import { getUserByEmail } from '@/lib/users';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Emails a password reset link (src/lib/passwordReset.ts). At most 5 an hour
// per email address and 20 per IP address.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const emailAddress = typeof body.emailAddress === 'string' ? body.emailAddress.trim().toLowerCase() : '';

    if (!emailAddress) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(emailAddress)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    const limit = { max: 5, windowMs: 60 * 60 * 1000 };
    if (
      tooManyAttempts(`forgot-password:${emailAddress}`, limit) ||
      tooManyAttempts(`forgot-password-ip:${clientIp(request)}`, { ...limit, max: 20 })
    ) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('Resend API key not configured. Password reset email disabled.');
      return NextResponse.json({ error: 'Email service is not configured' }, { status: 500 });
    }

    const user = await getUserByEmail(emailAddress);
    if (!user) {
      return NextResponse.json({ error: 'Email address not found' }, { status: 404 });
    }

    const siteUrl = getPublicSiteUrl(request);
    const token = await createPasswordResetToken(user.id);
    const sent = await sendEmail(user.emailAddress, {
      siteUrl,
      subject: 'Reset your Clarivex password',
      heading: 'Reset your password',
      intro: [
        `Hi ${user.userName}, we received a request to reset the password for your Clarivex account.`,
        'Choose a new password with the button below.',
      ],
      button: { label: 'Reset Password', url: `${siteUrl}/reset-password?token=${token}` },
      note: 'This link expires in 1 hour and can only be used once.',
      footnote: "If you didn't request this, you can ignore this email. Your password won't change.",
    });
    if (!sent) {
      return NextResponse.json({ error: 'Failed to send reset email' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process your request' }, { status: 500 });
  }
}
