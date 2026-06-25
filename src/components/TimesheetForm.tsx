'use client';

import { useEffect, useState } from 'react';

interface ClockifyProject {
  id: string;
  name: string;
}

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function TimesheetForm() {
  const [formData, setFormData] = useState({
    startDate: getTodayDateString(),
    endDate: getTodayDateString(),
    projectName: '',
    description: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const [projects, setProjects] = useState<ClockifyProject[]>([]);
  const [projectsStatus, setProjectsStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    fetch('/api/clockify/projects')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load projects');
        return res.json();
      })
      .then((data) => {
        setProjects(data.projects);
        setProjectsStatus('ready');
      })
      .catch(() => setProjectsStatus('error'));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.startDate > formData.endDate) {
      setStatus('error');
      setMessage('Start date must be the same as or before the end date.');
      return;
    }

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
      setFormData({ startDate: '', endDate: '', projectName: '', description: '' });

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
          max={formData.endDate || undefined}
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
          min={formData.startDate || undefined}
          required
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
        />
      </div>

      {/* Project Name Field */}
      <div>
        <label htmlFor="projectName" className="block text-sm font-medium text-dark-blue mb-2">
          Project Name *
        </label>
        <select
          id="projectName"
          name="projectName"
          value={formData.projectName}
          onChange={handleChange}
          required
          disabled={projectsStatus !== 'ready'}
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="" disabled>
            {projectsStatus === 'loading'
              ? 'Loading projects...'
              : projectsStatus === 'error'
              ? 'Unable to load projects'
              : 'Select a project'}
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.name}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Description Field */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-dark-blue mb-2">
          Description *
        </label>
        <input
          type="text"
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
          placeholder="AZ Incident Tracking, AZ Portal front-end updates"
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
      <div className="pt-4 pb-2">
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
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
      </div>
    </form>
  );
}
