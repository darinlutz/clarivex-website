'use client';

import { useState } from 'react';

export default function TimesheetForm() {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/timesheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit time');
      }

      setStatus('success');
      setMessage('Thank you! Your timesheet has been submitted successfully.');
      setFormData({ startDate: '', endDate: '' });

      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error ? error.message : 'Failed to submit time. Please try again.'
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Start Date Field */}
      <div>
        <label htmlFor="startDate" className="block text-sm font-medium text-dark-blue mb-2">
          Start Date *
        </label>
        <input
          type="date"
          id="startDate"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
        />
      </div>

      {/* End Date Field */}
      <div>
        <label htmlFor="endDate" className="block text-sm font-medium text-dark-blue mb-2">
          End Date *
        </label>
        <input
          type="date"
          id="endDate"
          name="endDate"
          value={formData.endDate}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
        />
      </div>

      {/* Status Messages */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            status === 'success'
              ? 'bg-green-100 border border-green-300 text-green-800'
              : 'bg-red-100 border border-red-300 text-red-800'
          }`}
        >
          {message}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full px-6 py-3 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
      >
        {status === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Submitting...
          </span>
        ) : (
          'Submit Time'
        )}
      </button>
    </form>
  );
}
