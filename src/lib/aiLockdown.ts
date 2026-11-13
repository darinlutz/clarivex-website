import { query } from './db';
import { ensureUserSchema } from './users';

// The emergency AI lockdown, switched on the Admin page. While it is on, every
// AI route refuses to run for everyone, admins included (requireAi in
// src/lib/adminAccess.ts). Stored in clarivex."SiteSettings" and read on every
// request, so it takes effect at once on every server instance and survives
// restarts and deploys.

const KEY = 'ai_lockdown';

export type AiLockdown = {
  locked: boolean;
  // When and by whom the switch was last changed; null if it never was
  updatedAt: string | null;
  updatedBy: string | null;
};

export async function getAiLockdown(): Promise<AiLockdown> {
  await ensureUserSchema();
  const [row] = await query(
    `SELECT s.value, s.updated_at, u.user_name
     FROM clarivex."SiteSettings" s LEFT JOIN clarivex."Users" u ON u.id = s.updated_by
     WHERE s.key = $1`,
    [KEY]
  );
  return {
    locked: row?.value === 'on',
    updatedAt: row ? new Date(row.updated_at as string).toISOString() : null,
    updatedBy: (row?.user_name as string | null | undefined) ?? null,
  };
}

export async function isAiLockedDown(): Promise<boolean> {
  return (await getAiLockdown()).locked;
}

export async function setAiLockdown(locked: boolean, userId: number): Promise<AiLockdown> {
  await ensureUserSchema();
  await query(
    `INSERT INTO clarivex."SiteSettings" (key, value, updated_by) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [KEY, locked ? 'on' : 'off', userId]
  );
  console.warn(`AI lockdown switched ${locked ? 'ON' : 'OFF'} by user ${userId}`);
  return getAiLockdown();
}
