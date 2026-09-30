// Browser-side helpers for logging hours on a Jira issue through /api/jira/worklog

// Today as YYYY-MM-DD in the browser's time zone
export const localToday = () => new Date().toLocaleDateString('en-CA');

// "2026-09-30" -> "2026-09-30T09:00:00.000-0400": 9 AM on that day in the browser's time zone
function startedAt(date: string) {
  const offsetMinutes = -new Date(`${date}T09:00:00`).getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offset = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}${String(abs % 60).padStart(2, '0')}`;
  return `${date}T09:00:00.000${offset}`;
}

export async function postWorklog(issueKey: string, hours: number, date: string) {
  const response = await fetch('/api/jira/worklog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ issueKey, hours, started: startedAt(date) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to log hours in Jira');
}
