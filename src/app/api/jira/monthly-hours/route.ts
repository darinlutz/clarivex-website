import { NextResponse } from 'next/server';
import { fetchMyHoursByProject } from '@/lib/jira';
import { requireOwner } from '@/lib/ownerAccess';

// start and end are epoch milliseconds (the browser's month boundaries, in its own time zone)
export async function GET(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;

  try {
    const searchParams = new URL(request.url).searchParams;
    const start = Number(searchParams.get('start'));
    const end = Number(searchParams.get('end'));

    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start <= 0 || end <= start) {
      return NextResponse.json({ error: 'Missing or invalid date range' }, { status: 400 });
    }
    if (end - start > 32 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'Date range must be at most one month' }, { status: 400 });
    }

    if (!process.env.ATLASSIAN_API_KEY) {
      console.error('ATLASSIAN_API_KEY is not configured');
      return NextResponse.json({ error: 'Atlassian API key not configured' }, { status: 500 });
    }

    const projects = await fetchMyHoursByProject(start, end);

    return NextResponse.json({ success: true, projects }, { status: 200 });
  } catch (error) {
    console.error('Jira monthly hours error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load Jira hours' },
      { status: 500 }
    );
  }
}
