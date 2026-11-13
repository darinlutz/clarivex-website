import { createHash, randomBytes } from 'node:crypto';
import { query, transaction } from './db';
import { sendEmail } from './email';
import { ensureUserSchema, markEmailVerified, type User } from './users';

// Confirming a new account's email address. Signing up emails a link
// (sendVerificationEmail); opening it (GET /api/auth/verify-email?token=)
// marks the address verified, and only then can the account log in. Accounts
// from before this existed count as verified. Only a hash of each token is
// stored, like PasswordResets.

const VERIFY_TTL_MS = 3 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// A new link for the user; earlier ones stop working
async function createEmailVerificationToken(userId: number): Promise<string> {
  await ensureUserSchema();
  const token = randomBytes(32).toString('hex');
  await transaction(async (client) => {
    await client.query('DELETE FROM clarivex."EmailVerifications" WHERE user_id = $1', [userId]);
    await client.query(
      'INSERT INTO clarivex."EmailVerifications" (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [hashToken(token), userId, Date.now() + VERIFY_TTL_MS]
    );
  });
  return token;
}

// Marks the link's account verified. False for an unknown or expired link.
// The link keeps working until it expires, so an email app that opens links
// to scan them doesn't use it up before the user clicks; it only verifies,
// it never signs anyone in.
export async function verifyEmailToken(token: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(token)) return false;
  await ensureUserSchema();
  const [row] = await query('SELECT user_id, expires_at FROM clarivex."EmailVerifications" WHERE token_hash = $1', [
    hashToken(token),
  ]);
  // BIGINT columns come back from pg as strings
  if (!row || Number(row.expires_at) < Date.now()) return false;
  await markEmailVerified(Number(row.user_id));
  return true;
}

// Emails the link. False when it couldn't be sent (the forms' Resend button tries again)
export async function sendVerificationEmail(user: User, siteUrl: string): Promise<boolean> {
  const link = `${siteUrl}/api/auth/verify-email?token=${await createEmailVerificationToken(user.id)}`;
  return sendEmail(user.emailAddress, {
    siteUrl,
    subject: 'Verify your email address for Clarivex',
    heading: `Welcome to Clarivex, ${user.userName}`,
    intro: [
      'Thanks for creating an account. Please confirm that this is your email address to finish setting it up.',
      'Once your address is verified you can log in.',
    ],
    button: { label: 'Verify Email Address', url: link },
    note: 'This link expires in 3 days.',
    footnote: "If you didn't create a Clarivex account, you can ignore this email and nothing will happen.",
  });
}
