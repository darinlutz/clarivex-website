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
};

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
      .then(addStripeColumns)
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }
  return schemaReady;
}

// CREATE TABLE IF NOT EXISTS won't add columns to an existing Users table, and
// SQLite has no ADD COLUMN IF NOT EXISTS, so add any missing ones explicitly.
async function addStripeColumns(): Promise<void> {
  const db = getDb();
  const info = await db.execute('PRAGMA table_info(Users)');
  const existing = new Set(info.rows.map((row) => row.name as string));
  for (const column of ['StripeCustomerId', 'StripeSubscriptionId']) {
    if (!existing.has(column)) {
      await db.execute(`ALTER TABLE Users ADD COLUMN ${column} TEXT`);
    }
  }
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
      sql: `INSERT INTO Users (FirstName, LastName, EmailAddress, Password, AccountStatus)
            VALUES (?, ?, ?, ?, 'New')
            RETURNING Id, FirstName, LastName, EmailAddress, AccountStatus`,
      args: [input.firstName, input.lastName, input.emailAddress, passwordHash],
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
    sql: 'SELECT Id, FirstName, LastName, EmailAddress, Password, AccountStatus FROM Users WHERE EmailAddress = ?',
    args: [emailAddress],
  });
  const row = result.rows[0];
  if (!row) return null;
  const ok = await verifyPassword(password, row.Password as string);
  return ok ? rowToUser(row) : null;
}

export async function getUserById(id: number): Promise<User | null> {
  await ensureUserSchema();
  const result = await getDb().execute({
    sql: 'SELECT Id, FirstName, LastName, EmailAddress, AccountStatus FROM Users WHERE Id = ?',
    args: [id],
  });
  const row = result.rows[0];
  return row ? rowToUser(row) : null;
}

// Links a completed Checkout Session to the user who started it.
export async function linkStripeSubscription(
  userId: number,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  accountStatus: string
): Promise<void> {
  await ensureUserSchema();
  await getDb().execute({
    sql: `UPDATE Users SET StripeCustomerId = ?, StripeSubscriptionId = ?, AccountStatus = ?
          WHERE Id = ?`,
    args: [stripeCustomerId, stripeSubscriptionId, accountStatus, userId],
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
