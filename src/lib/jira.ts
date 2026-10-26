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

export interface IssueHours {
  key: string;
  url: string;
  summary: string;
  hours: number;
}

export interface ProjectHours {
  project: string;
  hours: number;
  issues: IssueHours[]; // most hours first
}

interface WorklogResponse {
  worklogs?: Array<{ author?: { accountId: string }; timeSpentSeconds: number }>;
  startAt: number;
  maxResults: number;
  total: number;
  errorMessages?: string[];
}

async function jiraGet<T extends { errorMessages?: string[] }>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: authHeader(), Accept: 'application/json' },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.errorMessages?.join('; ') || `Jira request failed (${response.status})`);
  }
  return data;
}

// Epoch ms -> "2026-10-01" in UTC, for JQL worklogDate bounds
const jqlDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Hours the signed-in user logged between start (inclusive) and end (exclusive), both epoch ms,
// grouped by project, most hours first
export async function fetchMyHoursByProject(start: number, end: number): Promise<ProjectHours[]> {
  const { accountId } = await jiraGet<{ accountId: string; errorMessages?: string[] }>('/rest/api/3/myself');

  // worklogDate is matched in the Jira profile's time zone, so widen it by a day on each side
  // and filter exactly on each worklog's start time below
  const day = 24 * 60 * 60 * 1000;
  const jql =
    `worklogAuthor = currentUser() AND worklogDate >= "${jqlDate(start - day)}" ` +
    `AND worklogDate <= "${jqlDate(end + day)}"`;
  const issues: Array<{ key: string; project: string; summary: string }> = [];
  let nextPageToken: string | undefined;

  do {
    const params = new URLSearchParams({ jql, fields: 'project,summary', maxResults: String(PAGE_SIZE) });
    if (nextPageToken) params.set('nextPageToken', nextPageToken);
    const data = await jiraGet<SearchResponse>(`/rest/api/3/search/jql?${params}`);
    for (const issue of data.issues ?? []) {
      issues.push({ key: issue.key, project: issue.fields.project.name, summary: issue.fields.summary });
    }
    nextPageToken = data.isLast ? undefined : data.nextPageToken;
  } while (nextPageToken);

  const byProject = new Map<string, IssueHours[]>();
  await Promise.all(
    issues.map(async ({ key, project, summary }) => {
      let seconds = 0;
      let startAt = 0;
      let total = 0;
      do {
        const params = new URLSearchParams({
          startedAfter: String(start),
          startedBefore: String(end - 1),
          startAt: String(startAt),
        });
        const data = await jiraGet<WorklogResponse>(
          `/rest/api/3/issue/${encodeURIComponent(key)}/worklog?${params}`
        );
        const worklogs = data.worklogs ?? [];
        for (const worklog of worklogs) {
          if (worklog.author?.accountId === accountId) seconds += worklog.timeSpentSeconds;
        }
        startAt += worklogs.length;
        total = data.total;
        if (worklogs.length === 0) break;
      } while (startAt < total);
      if (seconds === 0) return;
      const issueHours = { key, url: `${BASE_URL}/browse/${key}`, summary, hours: seconds / 3600 };
      byProject.set(project, [...(byProject.get(project) ?? []), issueHours]);
    })
  );

  return [...byProject]
    .map(([project, projectIssues]) => ({
      project,
      hours: projectIssues.reduce((sum, issue) => sum + issue.hours, 0),
      issues: projectIssues.sort((a, b) => b.hours - a.hours || a.key.localeCompare(b.key)),
    }))
    .sort((a, b) => b.hours - a.hours || a.project.localeCompare(b.project));
}
