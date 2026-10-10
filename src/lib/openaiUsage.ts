// OpenAI API keys and this month's spend, for the Trends page's AI Usage Limits tab.
// Listing keys and reading costs needs an Admin key (OPENAI_ADMIN_KEY), not the regular OPENAI_API_KEY.
// OpenAI reports cost per project, not per key, so each key row shows its project's spend.

const BASE_URL = 'https://api.openai.com/v1/organization';

export type OpenAIKeyRow = {
  id: string;
  name: string;
  redactedValue: string;
  project: string;
  lastUsed: string | null; // ISO timestamp
  projectSpend: number;
};

export type OpenAIUsage = {
  month: string; // e.g. "2026-10"
  currency: string;
  totalSpend: number;
  keys: OpenAIKeyRow[];
};

type Page<T> = { data?: T[]; has_more?: boolean; last_id?: string; next_page?: string | null };
type Project = { id: string; name: string };
type ProjectKey = { id: string; name?: string; redacted_value?: string; last_used_at?: number | null };
type CostBucket = {
  results?: { amount?: { value?: number; currency?: string }; project_id?: string | null }[];
};

async function get<T>(path: string, params: URLSearchParams, adminKey: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}?${params}`, {
    headers: { Authorization: `Bearer ${adminKey}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || `OpenAI returned ${res.status} for ${path}`);
  }
  return (await res.json()) as T;
}

// Follows has_more/last_id until every item is read
async function listAll<T extends { id: string }>(path: string, adminKey: string): Promise<T[]> {
  const items: T[] = [];
  let after: string | undefined;
  for (let i = 0; i < 20; i++) {
    const params = new URLSearchParams({ limit: '100' });
    if (after) params.set('after', after);
    const page = await get<Page<T>>(path, params, adminKey);
    items.push(...(page.data ?? []));
    if (!page.has_more || !page.data?.length) break;
    after = page.last_id ?? page.data[page.data.length - 1].id;
  }
  return items;
}

// Daily cost buckets since the start of the month (UTC), added up per project
async function monthlySpend(adminKey: string, startOfMonth: Date) {
  const byProject = new Map<string, number>();
  let total = 0;
  let currency = 'usd';
  let page: string | null | undefined;

  for (let i = 0; i < 10; i++) {
    const params = new URLSearchParams({
      start_time: String(Math.floor(startOfMonth.getTime() / 1000)),
      bucket_width: '1d',
      limit: '31',
    });
    params.append('group_by', 'project_id');
    if (page) params.set('page', page);

    const costs = await get<Page<CostBucket>>('/costs', params, adminKey);
    for (const bucket of costs.data ?? []) {
      for (const result of bucket.results ?? []) {
        const value = result.amount?.value ?? 0;
        currency = result.amount?.currency ?? currency;
        total += value;
        if (result.project_id) byProject.set(result.project_id, (byProject.get(result.project_id) ?? 0) + value);
      }
    }
    page = costs.next_page;
    if (!costs.has_more || !page) break;
  }
  return { byProject, total, currency };
}

export async function getOpenAIUsage(adminKey: string): Promise<OpenAIUsage> {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [projects, spend] = await Promise.all([
    listAll<Project>('/projects', adminKey),
    monthlySpend(adminKey, startOfMonth),
  ]);

  const keyLists = await Promise.all(
    projects.map(async (project) => ({
      project,
      keys: await listAll<ProjectKey>(`/projects/${encodeURIComponent(project.id)}/api_keys`, adminKey),
    }))
  );

  const keys = keyLists.flatMap(({ project, keys }) =>
    keys.map((key) => ({
      id: key.id,
      name: key.name || '(unnamed)',
      redactedValue: key.redacted_value ?? '',
      project: project.name,
      lastUsed: key.last_used_at ? new Date(key.last_used_at * 1000).toISOString() : null,
      projectSpend: spend.byProject.get(project.id) ?? 0,
    }))
  );

  return {
    month: startOfMonth.toISOString().slice(0, 7),
    currency: spend.currency,
    totalSpend: spend.total,
    keys,
  };
}
