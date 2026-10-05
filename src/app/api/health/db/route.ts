import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Reports whether DATABASE_URL is usable, without revealing the password, so a
// deployed instance's database problem can be diagnosed from the browser.
function describeDatabaseUrl(raw: string | undefined) {
  if (raw === undefined) return { set: false };
  const trimmed = raw.trim();
  const info: Record<string, unknown> = {
    set: true,
    length: raw.length,
    hasSurroundingWhitespace: trimmed !== raw,
    hasQuotes: /^["']|["']$/.test(trimmed),
    startsWithVariableName: trimmed.startsWith('DATABASE_URL'),
  };
  try {
    const url = new URL(trimmed.replace(/^["']|["']$/g, ''));
    info.scheme = url.protocol;
    info.host = url.hostname;
    info.port = url.port || '(default)';
    info.database = url.pathname.slice(1);
    info.hasUser = !!url.username;
    info.hasPassword = !!url.password;
    info.sslmode = url.searchParams.get('sslmode');
  } catch {
    info.parseError = 'Not a valid URL';
  }
  return info;
}

export async function GET() {
  const databaseUrl = describeDatabaseUrl(process.env.DATABASE_URL);
  const started = Date.now();
  try {
    await query('SELECT 1');
    return NextResponse.json({ ok: true, ms: Date.now() - started, databaseUrl });
  } catch (error) {
    const { code, message } = (error ?? {}) as { code?: string; message?: string };
    return NextResponse.json(
      {
        ok: false,
        ms: Date.now() - started,
        databaseUrl,
        // Error messages can echo the connection string, so mask credentials
        error: { code, message: message?.replace(/\/\/[^@\s]*@/g, '//***@') },
      },
      { status: 500 }
    );
  }
}
