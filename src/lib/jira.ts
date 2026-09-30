// Jira Cloud (gordon-darby.atlassian.net), signed in with an Atlassian API token over Basic auth
const BASE_URL = 'https://gordon-darby.atlassian.net';
const EMAIL = 'lutz.d@gordon-darby.com';
const PAGE_SIZE = 100;

export interface JiraIssue {
  key: string;
  url: string;
  summary: string;
  type: string;
  status: string;
  statusCategory: string; // "To Do", "In Progress" or "Done"
  priority: string | null;
  project: string;
  dueDate: string | null; // YYYY-MM-DD
  updated: string; // ISO timestamp
  hoursLogged: number; // total time logged on the issue by everyone
}

interface SearchResponse {
  issues?: Array<{
    key: string;
    fields: {
      summary: string;
      issuetype: { name: string };
      status: { name: string; statusCategory: { name: string } };
      priority: { name: string } | null;
      project: { name: string };
      duedate: string | null;
      updated: string;
      timespent: number | null; // seconds
    };
  }>;
  nextPageToken?: string;
  isLast?: boolean;
  errorMessages?: string[];
}

function authHeader() {
  const token = process.env.ATLASSIAN_API_KEY;
  if (!token) throw new Error('ATLASSIAN_API_KEY is not configured');
  return `Basic ${Buffer.from(`${EMAIL}:${token}`).toString('base64')}`;
}

// Issues assigned to the signed-in user, most recently updated first; finished issues are left out
// unless includeDone is set
export async function fetchMyIssues(includeDone = false): Promise<JiraIssue[]> {
  const jql = `assignee = currentUser()${includeDone ? '' : ' AND statusCategory != Done'} ORDER BY updated DESC`;
  const issues: JiraIssue[] = [];
  let nextPageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      jql,
      fields: 'summary,issuetype,status,priority,project,duedate,updated,timespent',
      maxResults: String(PAGE_SIZE),
    });
    if (nextPageToken) params.set('nextPageToken', nextPageToken);

    const response = await fetch(`${BASE_URL}/rest/api/3/search/jql?${params}`, {
      headers: { Authorization: authHeader(), Accept: 'application/json' },
      cache: 'no-store',
    });
    const data: SearchResponse = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.errorMessages?.join('; ') || `Jira search failed (${response.status})`);
    }

    for (const issue of data.issues ?? []) {
      const f = issue.fields;
      issues.push({
        key: issue.key,
        url: `${BASE_URL}/browse/${issue.key}`,
        summary: f.summary,
        type: f.issuetype.name,
        status: f.status.name,
        statusCategory: f.status.statusCategory.name,
        priority: f.priority?.name ?? null,
        project: f.project.name,
        dueDate: f.duedate,
        updated: f.updated,
        hoursLogged: (f.timespent ?? 0) / 3600,
      });
    }
    nextPageToken = data.isLast ? undefined : data.nextPageToken;
  } while (nextPageToken);

  // Most recently updated first (the JQL asks for this too; sorting here guarantees it)
  return issues.sort((a, b) => Date.parse(b.updated) - Date.parse(a.updated));
}

export const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9_]*-\d+$/;

// Logs work on an issue, like "Log work" in Jira. started is when the work began, in Jira's
// format ("2026-09-30T09:00:00.000-0400"); Jira lowers the remaining estimate automatically.
export async function logWork(issueKey: string, hours: number, started: string) {
  const body = { timeSpentSeconds: Math.round(hours * 3600), started };

  const response = await fetch(`${BASE_URL}/rest/api/3/issue/${encodeURIComponent(issueKey)}/worklog`, {
    method: 'POST',
    headers: { Authorization: authHeader(), Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messages = [...(data.errorMessages ?? []), ...Object.values(data.errors ?? {})];
    throw new Error(messages.join('; ') || `Jira rejected the worklog (${response.status})`);
  }
}
