import { NextResponse } from 'next/server';
import { fetchMyIssues } from '@/lib/jira';

export async function GET(request: Request) {
  try {
    if (!process.env.ATLASSIAN_API_KEY) {
      console.error('ATLASSIAN_API_KEY is not configured');
      return NextResponse.json({ error: 'Atlassian API key not configured' }, { status: 500 });
    }

    const includeDone = new URL(request.url).searchParams.get('includeDone') === 'true';
    const issues = await fetchMyIssues(includeDone);

    return NextResponse.json({ success: true, issues }, { status: 200 });
  } catch (error) {
    console.error('Jira error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load Jira issues' },
      { status: 500 }
    );
  }
}
