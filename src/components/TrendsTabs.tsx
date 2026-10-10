'use client';

import { useState } from 'react';
import Link from 'next/link';
import TrendsForm from '@/components/TrendsForm';
import SqlQuery from '@/components/SqlQuery';
import AiUsageLimits from '@/components/AiUsageLimits';

type Tab = 'googleTrends' | 'sqlQuery' | 'aiUsage';

const TABS: { value: Tab; label: string }[] = [
  { value: 'googleTrends', label: 'Google Trends' },
  { value: 'sqlQuery', label: 'SQL Query' },
  { value: 'aiUsage', label: 'AI Usage Limits' },
];

export default function TrendsTabs({ signedIn, canQuery }: { signedIn: boolean; canQuery: boolean }) {
  const [activeTab, setActiveTab] = useState<Tab>('googleTrends');

  return (
    <>
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-4 mb-6 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'text-powder-600 border-powder-600'
                : 'text-slate-600 border-transparent hover:text-dark-blue'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-8">
        {activeTab === 'googleTrends' && (
          <div>
            <h2 className="text-2xl font-bold text-dark-blue mb-2">Top Trends</h2>
            <p className="text-slate-600 mb-8">
              Optionally enter a region or topic to focus on, then press Submit.
            </p>
            <TrendsForm />
          </div>
        )}

        {activeTab === 'sqlQuery' && (
          <div>
            <h2 className="text-2xl font-bold text-dark-blue mb-2">SQL Query</h2>
            {canQuery ? (
              <>
                <p className="text-slate-600 mb-8">
                  Type a SQL query against the site&apos;s database, then press Run Query.
                </p>
                <SqlQuery />
              </>
            ) : signedIn ? (
              <p className="text-slate-600">Only admins can run SQL queries.</p>
            ) : (
              <p className="text-slate-600">
                <Link href="/login" className="font-semibold text-powder-600 hover:underline">
                  Log in
                </Link>{' '}
                with an admin account to run SQL queries.
              </p>
            )}
          </div>
        )}

        {activeTab === 'aiUsage' && (
          <div>
            <h2 className="text-2xl font-bold text-dark-blue mb-2">AI Usage Limits</h2>
            {canQuery ? (
              <>
                <p className="text-slate-600 mb-8">Your OpenAI API keys and what they have spent this month.</p>
                <AiUsageLimits />
              </>
            ) : signedIn ? (
              <p className="text-slate-600">Only admins can see AI usage.</p>
            ) : (
              <p className="text-slate-600">
                <Link href="/login" className="font-semibold text-powder-600 hover:underline">
                  Log in
                </Link>{' '}
                with an admin account to see AI usage.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
