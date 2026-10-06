'use client';

import { Fragment, useEffect, useState } from 'react';
import JiraLogWork from '@/components/JiraLogWork';
import type { JiraIssue } from '@/lib/jira';
import { localToday, postWorklog } from '@/lib/jiraWorklog';

const STATUS_COLORS: Record<string, string> = {
  'To Do': 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-powder-100 text-powder-700',
  Done: 'bg-green-100 text-green-800',
};

function formatDate(value: string) {
  // Due dates are plain dates; parse them as local so they don't shift a day
  const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// "2026-09-30T17:26:29.839-0400" -> "Sep 30, 2026, 5:26 PM" in local time
function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// 1.5 -> "1.5h", 0 -> "—"
function formatHours(hours: number) {
  return hours > 0 ? `${Number(hours.toFixed(2))}h` : '—';
}

async function requestIssues(includeDone: boolean): Promise<JiraIssue[]> {
  const response = await fetch(`/api/jira/my-issues?includeDone=${includeDone}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load Jira issues');
  return data.issues;
}

export default function JiraIssues() {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [includeDone, setIncludeDone] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [error, setError] = useState('');
  const [loggingKey, setLoggingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [quickLogging, setQuickLogging] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    requestIssues(includeDone).then(
      (result) => {
        if (cancelled) return;
        setIssues(result);
        setError('');
        setStatus('idle');
      },
      (err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load Jira issues');
        setStatus('error');
      }
    );
    return () => {
      cancelled = true;
    };
  }, [includeDone, refreshCount]);

  const reload = (nextIncludeDone = includeDone) => {
    setStatus('loading');
    setNotice('');
    setIncludeDone(nextIncludeDone);
    setRefreshCount((count) => count + 1);
  };

  // "+ 8": logs a full 8-hour day on the issue for today
  const logFullDay = async (issueKey: string) => {
    setQuickLogging(issueKey);
    setNotice('');
    try {
      await postWorklog(issueKey, 8, localToday());
      reload();
      setNotice(`Logged 8h on ${issueKey} for today.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log hours in Jira');
      setStatus('error');
    } finally {
      setQuickLogging(null);
    }
  };

  const overdue = issues.filter((issue) => issue.statusCategory !== 'Done' && issue.dueDate && issue.dueDate < localToday());

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {status === 'loading'
            ? 'Loading…'
            : `${issues.length} issue${issues.length === 1 ? '' : 's'} assigned to you` +
              (overdue.length > 0 ? `, ${overdue.length} past due` : '')}
        </p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={includeDone}
              onChange={(e) => reload(e.target.checked)}
              className="accent-powder-600"
            />
            Include done
          </label>
          <button
            type="button"
            onClick={() => reload()}
            disabled={status === 'loading'}
            className="px-4 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg text-dark-blue hover:border-powder-600 hover:text-powder-600 transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div className="px-4 py-3 rounded-lg border text-sm bg-green-50 border-green-200 text-green-900">{notice}</div>
      )}

      {status === 'error' && (
        <div className="px-4 py-3 rounded-lg border text-sm bg-red-50 border-red-200 text-red-900">{error}</div>
      )}

      {issues.length > 0 && (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
          <table className="w-full text-sm text-dark-blue">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                {['Key', 'Summary', 'Status', 'Due', 'Updated', 'Logged', ''].map((heading) => (
                  <th key={heading} className="px-3 py-2 font-medium whitespace-nowrap">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => {
                const pastDue = overdue.includes(issue);
                return (
                  <Fragment key={issue.key}>
                    <tr className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <a
                          href={issue.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-powder-600 hover:underline"
                        >
                          {issue.key}
                        </a>
                      </td>
                      <td className="px-3 py-2 min-w-64">
                        {issue.summary}
                        <div className="text-xs text-slate-500">{issue.project}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            STATUS_COLORS[issue.statusCategory] ?? STATUS_COLORS['To Do']
                          }`}
                        >
                          {issue.status}
                        </span>
                      </td>
                      <td className={`px-3 py-2 whitespace-nowrap ${pastDue ? 'text-red-600 font-semibold' : ''}`}>
                        {issue.dueDate ? formatDate(issue.dueDate) : '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(issue.updated)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatHours(issue.hoursLogged)}</td>
                      <td className="px-3 py-2 whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLoggingKey(loggingKey === issue.key ? null : issue.key);
                            setNotice('');
                          }}
                          className="px-3 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-dark-blue hover:border-powder-600 hover:text-powder-600 transition-colors"
                        >
                          + Hours
                        </button>
                        <button
                          type="button"
                          onClick={() => void logFullDay(issue.key)}
                          disabled={quickLogging !== null}
                          title="Log 8 hours on this issue for today"
                          className="px-3 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-dark-blue hover:border-powder-600 hover:text-powder-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {quickLogging === issue.key ? 'Saving…' : '+ 8'}
                        </button>
                      </td>
                    </tr>
                    {loggingKey === issue.key && (
                      <tr className="bg-powder-50">
                        <td colSpan={7}className="px-3 py-3">
                          <JiraLogWork
                            issueKey={issue.key}
                            onCancel={() => setLoggingKey(null)}
                            onLogged={(hours) => {
                              setLoggingKey(null);
                              reload();
                              setNotice(`Logged ${formatHours(hours)} on ${issue.key}.`);
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
