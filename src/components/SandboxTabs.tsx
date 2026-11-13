'use client';

import { useState } from 'react';
import Link from 'next/link';
import TripPlannerForm from '@/components/TripPlannerForm';
import OllamaSearch from '@/components/OllamaSearch';
import PdfAnalyzer from '@/components/PdfAnalyzer';
import ChatbotQA from '@/components/ChatbotQA';
import AgentRunner from '@/components/AgentRunner';
import TrendsForm from '@/components/TrendsForm';
import SqlQuery from '@/components/SqlQuery';
import AiUsageLimits from '@/components/AiUsageLimits';

type Tab = 'city' | 'ollama' | 'pdf' | 'qa' | 'agents' | 'googleTrends' | 'sqlQuery' | 'aiUsage';

const TABS: { value: Tab; label: string }[] = [
  { value: 'city', label: 'City Specific' },
  { value: 'ollama', label: 'Ollama Search' },
  { value: 'pdf', label: 'PDF Analyzer' },
  { value: 'qa', label: 'Chatbot Q&A' },
  { value: 'agents', label: 'Agents' },
  { value: 'googleTrends', label: 'Google Trends' },
  { value: 'sqlQuery', label: 'SQL Query' },
  { value: 'aiUsage', label: 'AI Usage Limits' },
];

// The Sandbox page (Admins only): every experiment on the site in one row of
// tabs. `aiLocked` is the Admin page's emergency lockdown; while it is on the
// AI tabs' requests are refused by the server.
export default function SandboxTabs({ aiLocked }: { aiLocked: boolean }) {
  const [activeTab, setActiveTab] = useState<Tab>('city');

  return (
    <div className="w-full">
      {/* Header Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-100 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 pb-2 bg-gradient-to-r from-powder-600 via-powder-500 to-powder-600 bg-clip-text text-transparent">
            Sandbox
          </h1>
          <p className="text-lg text-slate-600">
            AI experiments and admin tools: trip planning, search, document Q&amp;A, agents, trends and more.
          </p>
        </div>
      </section>

      {/* Sandbox Content */}
      <section className="py-16 px-6 sm:px-10 lg:px-16 bg-white flex flex-col items-center">
        <div className="w-full max-w-5xl">
          {aiLocked && (
            <p className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <strong>AI lockdown is on.</strong> The AI features on this page won&apos;t run until it is turned off on
              the{' '}
              <Link href="/admin" className="font-semibold underline">
                Admin page
              </Link>
              .
            </p>
          )}

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-x-4 mb-6 border-b border-slate-200">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
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
            {activeTab === 'city' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Plan Your Trip</h2>
                <p className="text-slate-600 mb-8">
                  Enter a city and your preferences to get a personalized trip plan.
                </p>
                <TripPlannerForm />
              </div>
            )}

            {activeTab === 'ollama' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Ollama Search</h2>
                <p className="text-slate-600 mb-6">Search the web via a local Ollama model.</p>
                <OllamaSearch />
              </div>
            )}

            {activeTab === 'pdf' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">PDF Analyzer</h2>
                <p className="text-slate-600 mb-6">Upload a PDF and ask questions about its contents (RAG).</p>
                <PdfAnalyzer />
              </div>
            )}

            {activeTab === 'qa' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Chatbot Q&amp;A</h2>
                <p className="text-slate-600 mb-6">
                  Ask a question and get a polite answer drawn from a set of saved web articles.
                </p>
                <ChatbotQA />
              </div>
            )}

            {activeTab === 'agents' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Agents</h2>
                <p className="text-slate-600 mb-6">
                  Give an agent instructions and it will carry them out, searching the web when it needs to.
                </p>
                <AgentRunner />
              </div>
            )}

            {activeTab === 'googleTrends' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Top Trends</h2>
                <p className="text-slate-600 mb-8">
                  See what people are searching for right now on Google Trends. Optionally enter a region or topic to
                  focus on, then press Submit.
                </p>
                <TrendsForm />
              </div>
            )}

            {activeTab === 'sqlQuery' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">SQL Query</h2>
                <p className="text-slate-600 mb-8">
                  Type a SQL query against the site&apos;s database, then press Run Query.
                </p>
                <SqlQuery />
              </div>
            )}

            {activeTab === 'aiUsage' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">AI Usage Limits</h2>
                <p className="text-slate-600 mb-8">Your OpenAI API keys and what they have spent this month.</p>
                <AiUsageLimits />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
