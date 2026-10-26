'use client';

import { Fragment, useEffect, useState } from 'react';
import type { ProjectHours } from '@/lib/jira';

const HOURS_PER_WEEKDAY = 8;

// 1.5 -> "1.5h"
function formatHours(hours: number) {
  return `${Number(hours.toFixed(2))}h`;
}

// Monday-Friday days in the given month (month is 0-based)
function weekdaysInMonth(year: number, month: number) {
  const days = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= days; day++) {
    const weekday = new Date(year, month, day).getDay();
    if (weekday !== 0 && weekday !== 6) count++;
  }
  return count;
}

async function requestHours(start: number, end: number): Promise<ProjectHours[]> {
  const response = await fetch(`/api/jira/monthly-hours?start=${start}&end=${end}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load Jira hours');
  return data.projects;
}

export default function JiraMonthlyHours() {
  // The current month in the browser's time zone
  const [now] = useState(() => new Date());
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const weekdays = weekdaysInMonth(year, month);

  const [projects, setProjects] = useState<ProjectHours[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 1).getTime();
    requestHours(start, end).then(
      (result) => {
        if (cancelled) return;
        setProjects(result);
        setError('');
        setStatus('idle');
      },
      (err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load Jira hours');
        setStatus('error');
      }
    );
    return () => {
      cancelled = true;
    };
  }, [year, month, refreshCount]);

  const reload = () => {
    setStatus('loading');
    setRefreshCount((count) => count + 1);
  };

  const toggle = (project: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(project)) next.add(project);
      return next;
    });

  const totalHours =projects.reduce((sum, { hours }) => sum + hours, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {status === 'loading'
            ? 'Loading…'
            : `Hours you logged in ${monthName} ${year} across ${projects.length} project${projects.length === 1 ? '' : 's'}`}
        </p>
        <button
          type="button"
          onClick={reload}
          disabled={status === 'loading'}
          className="px-4 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg text-dark-blue hover:border-powder-600 hover:text-powder-600 transition-colors disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {status === 'error' && (
        <div className="px-4 py-3 rounded-lg border text-sm bg-red-50 border-red-200 text-red-900">{error}</div>
      )}

      {status !== 'error' && (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
          <table className="w-full text-sm text-dark-blue">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Project</th>
                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Hours</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(({ project, hours, issues }) => {
                const isExpanded = expanded.has(project);
                return (
                  <Fragment key={project}>
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggle(project)}
                          aria-expanded={isExpanded}
                          className="flex items-center gap-2 font-semibold text-powder-600 hover:underline text-left"
                        >
                          <span className={`inline-block text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                          {project}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{formatHours(hours)}</td>
                    </tr>
                    {isExpanded &&
                      issues.map((issue) => (
                        <tr key={issue.key} className="bg-powder-50 border-t border-slate-100">
                          <td className="py-2 pl-10 pr-3">
                            <a
                              href={issue.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-powder-600 hover:underline mr-2"
                            >
                              {issue.key}
                            </a>
                            {issue.summary}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap text-slate-600">
                            {formatHours(issue.hours)}
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
              {status === 'idle' && projects.length === 0 && (
                <tr className="border-t border-slate-100">
                  <td colSpan={2} className="px-3 py-2 text-slate-500">
                    No hours logged in {monthName} yet.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 font-semibold">
              <tr>
                <td className="px-3 py-2">Total hours allocated (month to date)</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {status === 'loading' ? '…' : formatHours(totalHours)}
                </td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2">
                  Expected number of hours
                  <div className="text-xs font-normal text-slate-500">
                    {weekdays} weekdays in {monthName} × {HOURS_PER_WEEKDAY}h
                  </div>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{formatHours(weekdays * HOURS_PER_WEEKDAY)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
