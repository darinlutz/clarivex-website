import { randomUUID } from 'node:crypto';
import { getDb } from './db';

export type Friend = {
  id: string;
  name: string;
  country: string;
};

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getDb()
      .execute(
        `CREATE TABLE IF NOT EXISTS friends (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          country TEXT NOT NULL
        )`
      )
      .then(() => undefined);
  }
  return schemaReady;
}

export async function readFriends(): Promise<Friend[]> {
  await ensureSchema();
  const result = await getDb().execute('SELECT id, name, country FROM friends ORDER BY rowid');
  return result.rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    country: row.country as string,
  }));
}

export async function addFriend(name: string, country: string): Promise<Friend> {
  await ensureSchema();
  const friend: Friend = { id: randomUUID(), name, country };
  await getDb().execute({
    sql: 'INSERT INTO friends (id, name, country) VALUES (?, ?, ?)',
    args: [friend.id, friend.name, friend.country],
  });
  return friend;
}

export async function deleteFriend(id: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({ sql: 'DELETE FROM friends WHERE id = ?', args: [id] });
}
