import { NextResponse } from 'next/server';
import { runReadOnlyQuery } from '@/lib/db';
import { isAdmin } from '@/lib/roles';
import { getCurrentUser } from '@/lib/session';

// Runs one read-only SQL statement for the Trends page's SQL Query tab. Admins only.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Log in to run queries' }, { status: 401 });
  }
  if (!isAdmin(user.role)) {
    return NextResponse.json({ error: 'Only admins can run SQL queries' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const sql = typeof body.sql === 'string' ? body.sql.trim() : '';
  if (!sql) {
    return NextResponse.json({ error: 'Enter a SQL query' }, { status: 400 });
  }

  try {
    const result = await runReadOnlyQuery(sql);
    return NextResponse.json(result);
  } catch (error) {
    // Postgres errors (syntax, missing table, read-only violation, timeout)
    // are the admin's own query, so show them as-is.
    const message = error instanceof Error ? error.message : 'Query failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
