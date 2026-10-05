import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Public database health check. Only reports ok/not ok; the cause of a failure
// goes to the server logs (e.g. Render's Logs tab) rather than the response.
export async function GET() {
  try {
    await query('SELECT 1');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Database health check failed:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
