import { createHash, randomBytes } from 'node:crypto';
import { getDb } from './db';
import { ensureUserSchema, getUserById, updatePassword, type User } from './users';

const RESET_TTL_MS = 60 * 60 * 1000;

// Only a hash of the token is stored, so a leaked database can't be used to
// reset anyone's password.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Returns the raw token to put in the emailed link. Any earlier unused link
// for this user stops working.
export async function createPasswordResetToken(userId: number): Promise<string> {
  await ensureUserSchema();
  const token = randomBytes(32).toString('hex');
  await getDb().batch(
    [
      { sql: 'DELETE FROM PasswordResets WHERE UserId = ?', args: [userId] },
      {
        sql: 'INSERT INTO PasswordResets (TokenHash, UserId, ExpiresAt) VALUES (?, ?, ?)',
        args: [hashToken(token), userId, Date.now() + RESET_TTL_MS],
      },
    ],
    'write'
  );
  return token;
}

export async function getPasswordResetUser(token: string): Promise<User | null> {
  await ensureUserSchema();
  const result = await getDb().execute({
    sql: 'SELECT UserId, ExpiresAt FROM PasswordResets WHERE TokenHash = ?',
    args: [hashToken(token)],
  });
  const row = result.rows[0];
  if (!row || Number(row.ExpiresAt) < Date.now()) return null;
  return getUserById(Number(row.UserId));
}

// Returns false when the link is invalid, expired, or already used.
export async function resetPasswordWithToken(token: string, password: string): Promise<boolean> {
  const user = await getPasswordResetUser(token);
  if (!user) return false;
  await updatePassword(user.id, password);
  await getDb().execute({ sql: 'DELETE FROM PasswordResets WHERE UserId = ?', args: [user.id] });
  return true;
}
