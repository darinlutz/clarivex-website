'use client';

import { useState } from 'react';

export default function TripPlannerForm() {
  const [formData, setFormData] = useState({
    destination: 'Tokyo',
    preferences: 'food, shopping, museums',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    setResult('');

    try {
      const response = await fetch('/api/trip-planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get trip plan');
      }

      setStatus('success');
      setResult(data.result);
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error ? error.message : 'Failed to get trip plan. Please try again.'
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* City Name Field */}
      <div>
        <label htmlFor="destination" className="block text-sm font-medium text-dark-blue mb-2">
          City Name *
        </label>
        <input
          type="text"
          id="destination"
          name="destination"
          value={formData.destination}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
        />
      </div>

      {/* Preferences Field */}
      <div>
        <label htmlFor="preferences" className="block text-sm font-medium text-dark-blue mb-2">
          Preferences *
        </label>
        <input
          type="text"
          id="preferences"
          name="preferences"
          value={formData.preferences}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
        />
      </div>

      {/* Status Messages */}
      {message && (
        <div className="p-4 rounded-lg bg-red-100 border border-red-300 text-red-800">
          {message}
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-4 pb-2">
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full px-6 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Planning...
            </span>
          ) : (
            'Get Trip'
          )}
        </button>
      </div>

      {/* Trip Plan Result */}
      {result && (
        <div className="p-6 rounded-lg bg-white border border-slate-200 text-dark-blue whitespace-pre-wrap leading-relaxed">
          {result}
        </div>
      )}
    </form>
  );
}
