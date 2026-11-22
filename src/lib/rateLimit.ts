import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { query } from './db';
import { ensureUserSchema } from './users';

// Fixed-window rate limits stored in Postgres, so they hold across restarts
// and multiple server instances. Used to keep the public email-sending and
// sign-in routes from being spammed or brute-forced.

let tableReady: Promise<void> | null = null;

function ensureRateLimitTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await ensureUserSchema();
      await query(`CREATE TABLE IF NOT EXISTS clarivex."RateLimits" (
        key TEXT PRIMARY KEY,
        window_start BIGINT NOT NULL,
        count INTEGER NOT NULL
      )`);
    })().catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  return tableReady;
}

export type RateLimitRule = {
  // Identifies the bucket, e.g. `contact:ip:${ip}`. Hashed before storage.
  key: string;
  limit: number;
  windowMs: number;
};

// Counts one hit against every rule and returns true when any of them is over
// its limit. Every rule is counted even after one fails, so an attacker can't
// dodge a per-target limit by tripping a per-IP one first.
export async function isRateLimited(rules: RateLimitRule[]): Promise<boolean> {
  await ensureRateLimitTable();
  const now = Date.now();
  let limited = false;

  for (const rule of rules) {
    const key = createHash('sha256').update(rule.key).digest('hex');
    const [row] = await query<{ count: number }>(
      `INSERT INTO clarivex."RateLimits" AS r (key, window_start, count) VALUES ($1, $2, 1)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN r.window_start <= $2 - $3 THEN 1 ELSE r.count + 1 END,
         window_start = CASE WHEN r.window_start <= $2 - $3 THEN $2 ELSE r.window_start END
       RETURNING count`,
      [key, now, rule.windowMs]
    );
    if (Number(row.count) > rule.limit) limited = true;
  }

  // Occasionally clear out windows that ended long ago
  if (Math.random() < 0.01) {
    await query('DELETE FROM clarivex."RateLimits" WHERE window_start < $1', [now - 24 * 60 * 60 * 1000]).catch(
      () => undefined
    );
  }

  return limited;
}

// The visitor's IP as reported by the host's proxy (Render sets
// X-Forwarded-For). It can be spoofed by a client, which is why the email
// routes also carry per-recipient and site-wide caps that don't depend on it.
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

export function tooManyRequests(message = 'Too many requests. Please try again later.') {
  return NextResponse.json({ error: message }, { status: 429 });
}

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
