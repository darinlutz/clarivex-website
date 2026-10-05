import { randomUUID } from 'node:crypto';
import { query } from './db';

export type Friend = {
  id: string;
  name: string;
  country: string;
};

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    // Postgres has no rowid, so `seq` records insertion order for listing.
    schemaReady = query(
      `CREATE TABLE IF NOT EXISTS friends (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        country TEXT NOT NULL,
        seq BIGINT GENERATED ALWAYS AS IDENTITY
      )`
    )
      .then(() => undefined)
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }
  return schemaReady;
}

export async function readFriends(): Promise<Friend[]> {
  await ensureSchema();
  const rows = await query('SELECT id, name, country FROM friends ORDER BY seq');
  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    country: row.country as string,
  }));
}

export async function addFriend(name: string, country: string): Promise<Friend> {
  await ensureSchema();
  const friend: Friend = { id: randomUUID(), name, country };
  await query('INSERT INTO friends (id, name, country) VALUES ($1, $2, $3)', [friend.id, friend.name, friend.country]);
  return friend;
}

export async function deleteFriend(id: string): Promise<void> {
  await ensureSchema();
  await query('DELETE FROM friends WHERE id = $1', [id]);
}
