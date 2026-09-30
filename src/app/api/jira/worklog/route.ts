import { NextResponse } from 'next/server';
import { ISSUE_KEY_PATTERN, logWork } from '@/lib/jira';

// Jira's worklog start format, e.g. 2026-09-30T09:00:00.000-0400
const STARTED_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{4}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const issueKey = typeof body.issueKey === 'string' ? body.issueKey.trim() : '';
    const hours = Number(body.hours);
    const started = typeof body.started === 'string' ? body.started : '';

    if (!ISSUE_KEY_PATTERN.test(issueKey)) {
      return NextResponse.json({ error: 'Missing or invalid issue key' }, { status: 400 });
    }
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      return NextResponse.json({ error: 'Hours must be more than 0 and at most 24' }, { status: 400 });
    }
    if (Math.round(hours * 60) < 1) {
      return NextResponse.json({ error: 'Hours must be at least one minute' }, { status: 400 });
    }
    if (!STARTED_PATTERN.test(started)) {
      return NextResponse.json({ error: 'Missing or invalid start date' }, { status: 400 });
    }

    if (!process.env.ATLASSIAN_API_KEY) {
      console.error('ATLASSIAN_API_KEY is not configured');
      return NextResponse.json({ error: 'Atlassian API key not configured' }, { status: 500 });
    }

    await logWork(issueKey, hours, started);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Jira worklog error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to log hours in Jira' },
      { status: 500 }
    );
  }
}
