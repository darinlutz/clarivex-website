'use client';

import { useState } from 'react';
import PythonRunner from '@/components/PythonRunner';
import FriendsRoster from '@/components/FriendsRoster';
import ChatbotLogger from '@/components/ChatbotLogger';
import SpaceFactQuery from '@/components/SpaceFactQuery';
import StintAnalysis from '@/components/StintAnalysis';

export default function RacingPage() {
  const [activeTab, setActiveTab] = useState<'friends' | 'chatbot' | 'python' | 'spaceFacts' | 'racecar' | 'stint'>(
    'friends'
  );

  return (
    <div className="w-full">
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-100 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 pb-2 bg-gradient-to-r from-powder-600 via-powder-500 to-powder-600 bg-clip-text text-transparent">
            Racing
          </h1>
          <p className="text-lg text-slate-600">
            Keep track of your friends and run the local Python app.
          </p>
        </div>
      </section>

      <section className="py-16 px-6 sm:px-10 lg:px-16 bg-white flex flex-col items-center">
        <div className="w-full max-w-4xl">
          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'friends'
                  ? 'text-powder-600 border-powder-600'
                  : 'text-slate-600 border-transparent hover:text-dark-blue'
              }`}
            >
              Friends
            </button>
            <button
              onClick={() => setActiveTab('chatbot')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'chatbot'
                  ? 'text-powder-600 border-powder-600'
                  : 'text-slate-600 border-transparent hover:text-dark-blue'
              }`}
            >
              Chatbot Logger
            </button>
            <button
              onClick={() => setActiveTab('python')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'python'
                  ? 'text-powder-600 border-powder-600'
                  : 'text-slate-600 border-transparent hover:text-dark-blue'
              }`}
            >
              Python
            </button>
            <button
              onClick={() => setActiveTab('spaceFacts')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'spaceFacts'
                  ? 'text-powder-600 border-powder-600'
                  : 'text-slate-600 border-transparent hover:text-dark-blue'
              }`}
            >
              Space Fact Query
            </button>
            <button
              onClick={() => setActiveTab('racecar')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'racecar'
                  ? 'text-powder-600 border-powder-600'
                  : 'text-slate-600 border-transparent hover:text-dark-blue'
              }`}
            >
              Racecar Analysis
            </button>
            <button
              onClick={() => setActiveTab('stint')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'stint'
                  ? 'text-powder-600 border-powder-600'
                  : 'text-slate-600 border-transparent hover:text-dark-blue'
              }`}
            >
              Stint Analysis
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-8">
            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Friends</h2>
                <p className="text-slate-600 mb-6">
                  Keep track of your friends. This list is shared across everyone who visits.
                </p>
                <FriendsRoster />
              </div>
            )}

            {/* Chatbot Logger Tab */}
            {activeTab === 'chatbot' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Chatbot Logger</h2>
                <p className="text-slate-600 mb-6">
                  Chat with the logged chatbot and view its replies.
                </p>
                <ChatbotLogger />
              </div>
            )}

            {/* Python Tab */}
            {activeTab === 'python' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Python</h2>
                <p className="text-slate-600 mb-6">
                  Run the local Python app and view its output.
                </p>
                <PythonRunner />
              </div>
            )}

            {/* Space Fact Query Tab */}
            {activeTab === 'spaceFacts' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Space Fact Query</h2>
                <p className="text-slate-600 mb-6">
                  Ask a question and get an answer grounded in a small set of space facts (RAG).
                </p>
                <SpaceFactQuery />
              </div>
            )}

            {/* Racecar Analysis Tab */}
            {activeTab === 'racecar' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Racecar Analysis</h2>
                <p className="text-slate-600 mb-6">
                  Ask a question and get an answer grounded in the racecar analysis data (RAG).
                </p>
                <SpaceFactQuery
                  endpoint="/api/racecar-analysis"
                  queryLabel="Ask a Question About Racecars"
                  placeholder="Enter your racecar question here"
                />
              </div>
            )}

            {/* Stint Analysis Tab */}
            {activeTab === 'stint' && (
              <div>
                <h2 className="text-2xl font-bold text-dark-blue mb-2">Stint Analysis</h2>
                <p className="text-slate-600 mb-6">
                  Analyze a stint of laps to find where you are most inconsistent.
                </p>
                <StintAnalysis />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
