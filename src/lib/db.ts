import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;

// Falls back to a local file so `npm run dev` works with zero setup; set
// TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) to point at a hosted Turso database
// in any environment, including production, where the container filesystem
// is not persisted across deploys.
export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL ?? 'file:local.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;
    client = createClient({ url, authToken });
  }
  return client;
}
