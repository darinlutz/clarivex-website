const WORKSPACE_ID = '5f5fb2a73ab33d735bc7ca3a';
const BASE_URL = 'https://api.clockify.me/api/v1';

// UTC offset for your local timezone (e.g. -7 for MST, -5 for EST)
const UTC_OFFSET_HOURS = -6;

// US federal holidays (static list — update yearly as needed)
const FEDERAL_HOLIDAYS = new Set([
  '2026-01-01', // New Year's Day
  '2026-05-25', // Memorial Day
  '2026-07-04', // Independence Day
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving
  '2026-12-25', // Christmas
]);

function isWorkday(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun, 6=Sat
  if (weekday === 0 || weekday === 6) return false;
  if (FEDERAL_HOLIDAYS.has(dateStr)) return false;
  return true;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function workdaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  let current = start;
  while (current <= end) {
    if (isWorkday(current)) days.push(current);
    current = addDays(current, 1);
  }
  return days;
}

function localDateTimeToUtcIso(dateStr: string, localHour: number, localMinute = 0): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcMs = Date.UTC(y, m - 1, d, localHour, localMinute, 0) - UTC_OFFSET_HOURS * 3600 * 1000;
  return new Date(utcMs).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function clockifyHeaders(apiKey: string) {
  return {
    'X-Api-Key': apiKey,
    'Content-Type': 'application/json',
  };
}

async function getCurrentUserId(apiKey: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/user`, { headers: clockifyHeaders(apiKey) });
  if (!res.ok) throw new Error(`Failed to fetch current Clockify user (${res.status})`);
  const data = await res.json();
  return data.id;
}

async function getProjectId(apiKey: string, projectName: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/workspaces/${WORKSPACE_ID}/projects?page-size=200`, {
    headers: clockifyHeaders(apiKey),
  });
  if (!res.ok) throw new Error(`Failed to fetch Clockify projects (${res.status})`);
  const projects: Array<{ id: string; name: string }> = await res.json();
  const match = projects.find(
    (p) => p.name.trim().toUpperCase() === projectName.trim().toUpperCase()
  );
  if (!match) {
    throw new Error(
      `Project '${projectName}' not found. Available: ${projects.map((p) => p.name).join(', ')}`
    );
  }
  return match.id;
}

async function getTimeEntriesForDay(
  apiKey: string,
  userId: string,
  dateStr: string
): Promise<Array<{ id: string }>> {
  const params = new URLSearchParams({
    start: localDateTimeToUtcIso(dateStr, 0),
    end: localDateTimeToUtcIso(addDays(dateStr, 1), 0),
    hydrated: 'false',
    'page-size': '50',
  });
  const res = await fetch(
    `${BASE_URL}/workspaces/${WORKSPACE_ID}/user/${userId}/time-entries?${params}`,
    { headers: clockifyHeaders(apiKey) }
  );
  if (!res.ok) throw new Error(`Failed to fetch time entries for ${dateStr} (${res.status})`);
  return res.json();
}

async function deleteTimeEntry(apiKey: string, entryId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/workspaces/${WORKSPACE_ID}/time-entries/${entryId}`, {
    method: 'DELETE',
    headers: clockifyHeaders(apiKey),
  });
  if (!res.ok) throw new Error(`Failed to delete time entry ${entryId} (${res.status})`);
}

async function deleteExistingEntriesForDay(
  apiKey: string,
  userId: string,
  dateStr: string
): Promise<number> {
  const entries = await getTimeEntriesForDay(apiKey, userId, dateStr);
  for (const entry of entries) {
    await deleteTimeEntry(apiKey, entry.id);
  }
  return entries.length;
}

async function createTimeEntry(
  apiKey: string,
  projectId: string,
  dateStr: string,
  description: string
): Promise<{ id: string }> {
  const res = await fetch(`${BASE_URL}/workspaces/${WORKSPACE_ID}/time-entries`, {
    method: 'POST',
    headers: clockifyHeaders(apiKey),
    body: JSON.stringify({
      start: localDateTimeToUtcIso(dateStr, 8),
      end: localDateTimeToUtcIso(dateStr, 16),
      description,
      projectId,
      billable: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create time entry for ${dateStr} (${res.status}): ${text}`);
  }
  return res.json();
}

export async function submitTimesheet({
  apiKey,
  startDate,
  endDate,
  projectName,
  description,
}: {
  apiKey: string;
  startDate: string;
  endDate: string;
  projectName: string;
  description: string;
}): Promise<{ daysCreated: number; log: string[] }> {
  const log: string[] = [];
  const days = workdaysInRange(startDate, endDate);
  log.push(`Date range: ${startDate} -> ${endDate}`);
  log.push(`Workdays to log: ${days.length}`);

  const projectId = await getProjectId(apiKey, projectName);
  log.push(`Found project '${projectName}' -> ${projectId}`);

  const userId = await getCurrentUserId(apiKey);
  log.push(`Found user -> ${userId}`);

  for (const day of days) {
    const deletedCount = await deleteExistingEntriesForDay(apiKey, userId, day);
    if (deletedCount) {
      log.push(`  ${day}: removed ${deletedCount} existing entr${deletedCount === 1 ? 'y' : 'ies'}`);
    }
    const entry = await createTimeEntry(apiKey, projectId, day, description);
    log.push(`  Created: ${day} (${entry.id})`);
  }

  log.push(`Done — ${days.length} entries created.`);
  return { daysCreated: days.length, log };
}
