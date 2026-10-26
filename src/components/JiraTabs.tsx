'use client';

import { useState } from 'react';
import JiraIssues from '@/components/JiraIssues';
import JiraMonthlyHours from '@/components/JiraMonthlyHours';

const TABS = [
  { id: 'assigned', label: 'Assigned To Me' },
  { id: 'monthly', label: 'Monthly Hours' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function JiraTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('assigned');

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200">
      <div role="tablist" className="flex border-b border-slate-200 px-4 sm:px-6 pt-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 -mb-px text-sm sm:text-base font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-powder-600 text-powder-600'
                : 'border-transparent text-slate-500 hover:text-dark-blue'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="p-4 sm:p-6">
        {activeTab === 'assigned' ? <JiraIssues /> : <JiraMonthlyHours />}
      </div>
    </div>
  );
}
