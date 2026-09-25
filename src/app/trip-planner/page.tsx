'use client';

import { useState } from 'react';
import TripPlannerForm from '@/components/TripPlannerForm';
import OllamaSearch from '@/components/OllamaSearch';
import PdfAnalyzer from '@/components/PdfAnalyzer';
import ChatbotQA from '@/components/ChatbotQA';

export default function TripPlanner() {
  const [activeTab, setActiveTab] = useState<'city' | 'ollama' | 'pdf' | 'qa'>('city');

  return (
    <div className="w-full">
      {/* Header Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-100 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 pb-2 bg-gradient-to-r from-powder-600 via-powder-500 to-powder-600 bg-clip-text text-transparent">
            Trip Planner
          </h1>
          <p className="text-lg text-slate-600">
            Tell us where you&apos;re headed and your preferences, and we&apos;ll put together a plan.
          </p>
        </div>
      </section>

      {/* Trip Planner Content */}
      <section className="py-16 px-6 sm:px-10 lg:px-16 bg-white flex flex-col items-center">
        <div className="w-full max-w-4xl">
          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('city')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'city'
                  ? 'text-powder-600 border-powder-600'
                  : 'text-slate-600 border-transparent hover:text-dark-blue'
              }`}
            >
              City Specific
            </button>
            <button
              onClick={() => setActiveTab('ollama')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'ollama'
                  ? 'text-powder-600 border-powder-600'
                  : 'text-slate-600 border-transparent hover:text-dark-blue'
              }`}
            >
              Ollama Search
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'pdf'
                  ? 'text-powder-600 border-powder-600'
                  : 'text-slate-600 border-transparent hover:text-dark-blue'
              }`}
            >
              PDF Analyzer
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'qa'
                  ? 'text-powder-600 border-powder-600'
                  : 'text-slate-600 border-transparent hover:text-dark-blue'
              }`}
            >
              Chatbot Q&A
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-8">
            {/* City Specific Tab */}
            {activeTab === 'city' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Plan Your Trip</h2>
                <p className="text-slate-600 mb-8">
                  Enter a city and your preferences to get a personalized trip plan.
                </p>
                <TripPlannerForm />
              </div>
            )}

            {/* Ollama Search Tab */}
            {activeTab === 'ollama' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Ollama Search</h2>
                <p className="text-slate-600 mb-6">
                  Search the web via a local Ollama model.
                </p>
                <OllamaSearch />
              </div>
            )}

            {/* PDF Analyzer Tab */}
            {activeTab === 'pdf' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">PDF Analyzer</h2>
                <p className="text-slate-600 mb-6">
                  Upload a PDF and ask questions about its contents (RAG).
                </p>
                <PdfAnalyzer />
              </div>
            )}

            {/* Chatbot Q&A Tab */}
            {activeTab === 'qa' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Chatbot Q&amp;A</h2>
                <p className="text-slate-600 mb-6">
                  Ask a question and get a polite answer drawn from a set of saved web articles.
                </p>
                <ChatbotQA />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
