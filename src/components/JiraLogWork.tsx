'use client';

import { useState } from 'react';
import { localToday, postWorklog } from '@/lib/jiraWorklog';

const inputClass =
  'px-3 py-2 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors';

type JiraLogWorkProps = {
  issueKey: string;
  onLogged: (hours: number) => void;
  onCancel: () => void;
};

// Inline form for logging hours on one Jira issue
export default function JiraLogWork({ issueKey, onLogged, onCancel }: JiraLogWorkProps) {
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(localToday);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const hoursValue = parseFloat(hours);
  const valid = hoursValue > 0 && hoursValue <= 24 && Boolean(date);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    setSaving(true);
    setError('');
    try {
      await postWorklog(issueKey, hoursValue, date);
      onLogged(hoursValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log hours in Jira');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={`hours-${issueKey}`} className="block text-xs font-medium text-slate-600 mb-1">
            Hours
          </label>
          <input
            id={`hours-${issueKey}`}
            type="number"
            min="0.25"
            max="24"
            step="0.25"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g. 1.5"
            autoFocus
            className={`${inputClass} w-28`}
          />
        </div>
        <div>
          <label htmlFor={`date-${issueKey}`} className="block text-xs font-medium text-slate-600 mb-1">
            Date worked
          </label>
          <input
            id={`date-${issueKey}`}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!valid || saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-powder-500 to-powder-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Log hours'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg text-dark-blue hover:border-powder-600 hover:text-powder-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
