import { NextResponse } from 'next/server';

const WORKSPACE_ID = '5f5fb2a73ab33d735bc7ca3a';
const BASE_URL = 'https://api.clockify.me/api/v1';

interface ClockifyMembership {
  userId: string;
}

interface ClockifyProject {
  id: string;
  name: string;
  archived: boolean;
  public: boolean;
  memberships?: ClockifyMembership[];
}

export async function GET() {
  const apiKey = process.env.CLOCKIFY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Clockify API key not configured' },
      { status: 500 }
    );
  }

  const headers = {
    'X-Api-Key': apiKey,
    'Content-Type': 'application/json',
  };

  try {
    const userResponse = await fetch(`${BASE_URL}/user`, { headers });
    if (!userResponse.ok) {
      throw new Error('Failed to fetch current Clockify user');
    }
    const user = await userResponse.json();
    const userId = user.id;

    const projectsResponse = await fetch(
      `${BASE_URL}/workspaces/${WORKSPACE_ID}/projects?page-size=200`,
      { headers }
    );
    if (!projectsResponse.ok) {
      throw new Error('Failed to fetch Clockify projects');
    }
    const projects: ClockifyProject[] = await projectsResponse.json();

    const assigned = projects
      .filter(
        (p) =>
          !p.archived &&
          (p.public || p.memberships?.some((m) => m.userId === userId))
      )
      .map((p) => ({ id: p.id, name: p.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ projects: assigned }, { status: 200 });
  } catch (error) {
    console.error('Clockify projects fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
