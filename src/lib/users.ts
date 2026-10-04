import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getDb } from './db';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const KEY_LENGTH = 64;

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  emailAddress: string;
  accountStatus: string;
  signupDate: string | null;
  subscriptionEndDate: string | null;
  stripeSubscriptionId: string | null;
};

const USER_COLUMNS =
  'Id, FirstName, LastName, EmailAddress, AccountStatus, SignupDate, SubscriptionEndDate, StripeSubscriptionId';

// Dates are stored as ISO 8601 UTC strings, so they compare correctly as text.
// One month from `from`, clamped so Jan 31 becomes Feb 28/29 rather than Mar 3.
export function oneMonthFrom(from: Date = new Date()): string {
  const end = new Date(from);
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(from.getUTCDate(), lastDay));
  return end.toISOString();
}

function hasEnded(user: User): boolean {
  return !user.subscriptionEndDate || user.subscriptionEndDate < new Date().toISOString();
}

export function canSubscribe(user: User): boolean {
  return (
    user.accountStatus === 'New' ||
    user.accountStatus === 'Expired' ||
    (user.accountStatus === 'Canceled' && hasEnded(user))
  );
}

export class EmailTakenError extends Error {
  constructor() {
    super('An account with that email address already exists');
  }
}

let schemaReady: Promise<void> | null = null;

export function ensureUserSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getDb()
      .batch(
        [
          `CREATE TABLE IF NOT EXISTS Users (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            FirstName TEXT NOT NULL,
            LastName TEXT NOT NULL,
            EmailAddress TEXT NOT NULL UNIQUE COLLATE NOCASE,
            Password TEXT NOT NULL,
            AccountStatus TEXT NOT NULL DEFAULT 'New',
            CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )`,
          `CREATE TABLE IF NOT EXISTS Sessions (
            TokenHash TEXT PRIMARY KEY,
            UserId INTEGER NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
            ExpiresAt INTEGER NOT NULL
          )`,
        ],
        'write'
      )
      .then(addMissingColumns)
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }
  return schemaReady;
}

// CREATE TABLE IF NOT EXISTS won't add columns to an existing Users table, and
// SQLite has no ADD COLUMN IF NOT EXISTS, so add any missing ones explicitly.
async function addMissingColumns(): Promise<void> {
  const db = getDb();
  const info = await db.execute('PRAGMA table_info(Users)');
  const existing = new Set(info.rows.map((row) => row.name as string));
  for (const column of ['StripeCustomerId', 'StripeSubscriptionId', 'SignupDate', 'SubscriptionEndDate']) {
    if (!existing.has(column)) {
      await db.execute(`ALTER TABLE Users ADD COLUMN ${column} TEXT`);
    }
  }
  // Users created before SignupDate existed signed up when their row was created
  await db.execute(
    `UPDATE Users SET SignupDate = strftime('%Y-%m-%dT%H:%M:%fZ', CreatedAt) WHERE SignupDate IS NULL`
  );
}

// Stored as "scrypt$<salt hex>$<hash hex>" so the format is self-describing.
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.Id),
    firstName: row.FirstName as string,
    lastName: row.LastName as string,
    emailAddress: row.EmailAddress as string,
    accountStatus: row.AccountStatus as string,
    signupDate: (row.SignupDate as string | null) ?? null,
    subscriptionEndDate: (row.SubscriptionEndDate as string | null) ?? null,
    stripeSubscriptionId: (row.StripeSubscriptionId as string | null) ?? null,
  };
}

export async function createUser(input: {
  firstName: string;
  lastName: string;
  emailAddress: string;
  password: string;
}): Promise<User> {
  await ensureUserSchema();
  const passwordHash = await hashPassword(input.password);
  try {
    const result = await getDb().execute({
      sql: `INSERT INTO Users (FirstName, LastName, EmailAddress, Password, AccountStatus, SignupDate)
            VALUES (?, ?, ?, ?, 'New', ?)
            RETURNING ${USER_COLUMNS}`,
      args: [input.firstName, input.lastName, input.emailAddress, passwordHash, new Date().toISOString()],
    });
    return rowToUser(result.rows[0]);
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed/i.test(error.message)) {
      throw new EmailTakenError();
    }
    throw error;
  }
}

// Returns the user only when the email exists and the password matches.
export async function authenticateUser(emailAddress: string, password: string): Promise<User | null> {
  await ensureUserSchema();
  const result = await getDb().execute({
    sql: `SELECT ${USER_COLUMNS}, Password FROM Users WHERE EmailAddress = ?`,
    args: [emailAddress],
  });
  const row = result.rows[0];
  if (!row) return null;
  const ok = await verifyPassword(password, row.Password as string);
  return ok ? rowToUser(row) : null;
}

export async function getUserById(id: number): Promise<User | null> {
  await ensureUserSchema();
  const db = getDb();
  // A paid subscription whose end date has passed (e.g. a failed renewal) is expired
  await db.execute({
    sql: `UPDATE Users SET AccountStatus = 'Expired'
          WHERE Id = ? AND AccountStatus = 'Active' AND SubscriptionEndDate < ?`,
    args: [id, new Date().toISOString()],
  });
  const result = await db.execute({
    sql: `SELECT ${USER_COLUMNS} FROM Users WHERE Id = ?`,
    args: [id],
  });
  const row = result.rows[0];
  return row ? rowToUser(row) : null;
}

// Links a completed Checkout Session to the user who started it.
export async function startSubscription(
  userId: number,
  stripeCustomerId: string,
  stripeSubscriptionId: string
): Promise<void> {
  await ensureUserSchema();
  await getDb().execute({
    sql: `UPDATE Users SET StripeCustomerId = ?, StripeSubscriptionId = ?, AccountStatus = 'Active',
            SubscriptionEndDate = ?
          WHERE Id = ?`,
    args: [stripeCustomerId, stripeSubscriptionId, oneMonthFrom(), userId],
  });
}

// Called on each successful monthly renewal payment.
export async function renewSubscription(stripeSubscriptionId: string): Promise<void> {
  await ensureUserSchema();
  await getDb().execute({
    sql: `UPDATE Users SET AccountStatus = 'Active', SubscriptionEndDate = ?
          WHERE StripeSubscriptionId = ?`,
    args: [oneMonthFrom(), stripeSubscriptionId],
  });
}

export async function setStatusBySubscriptionId(
  stripeSubscriptionId: string,
  accountStatus: string
): Promise<void> {
  await ensureUserSchema();
  await getDb().execute({
    sql: 'UPDATE Users SET AccountStatus = ? WHERE StripeSubscriptionId = ?',
    args: [accountStatus, stripeSubscriptionId],
  });
}
