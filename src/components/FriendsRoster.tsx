'use client';

import { useEffect, useState } from 'react';
import { COUNTRIES } from '@/lib/countries';

type Friend = {
  id: string;
  name: string;
  country: string;
};

export default function FriendsRoster() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [name, setName] = useState('');
  const [country, setCountry] = useState<string>('Brazil');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/friends-roster')
      .then((response) => response.json())
      .then((data) => setFriends(data.friends ?? []))
      .catch(() => setMessage('Failed to load friends'));
  }, []);

  const handleAddFriend = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/friends-roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, country }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add friend');
      }

      setFriends((prev) => [...prev, data.friend]);
      setName('');
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to add friend');
    }
  };

  const handleDeleteFriend = async (id: string) => {
    setMessage('');

    try {
      const response = await fetch('/api/friends-roster', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete friend');
      }

      setFriends((prev) => prev.filter((friend) => friend.id !== id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to delete friend');
    }
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-8">
      <div className="flex flex-col sm:flex-row gap-3 mb-2">
        <div className="sm:w-48 flex-shrink-0">
          <label htmlFor="friend-country" className="block text-sm font-medium text-dark-blue mb-2">
            Country
          </label>
          <select
            id="friend-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="friend-name" className="block text-sm font-medium text-dark-blue mb-2">
            Name
          </label>
          <input
            id="friend-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
            placeholder="Enter a friend's name"
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-dark-blue placeholder-slate-400 focus:outline-none focus:border-powder-600 focus:ring-1 focus:ring-powder-500 transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={handleAddFriend}
          disabled={!name.trim() || status === 'loading'}
          className="px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex-shrink-0 sm:self-end"
        >
          {status === 'loading' ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
          ) : (
            'Add Friend'
          )}
        </button>
      </div>

      {message && (
        <div className="mt-4 p-3 rounded-lg bg-red-100 border border-red-300 text-red-800 text-sm">
          {message}
        </div>
      )}

      <div className="mt-6 space-y-2">
        {friends.length === 0 ? (
          <p className="text-sm text-slate-500">No friends added yet.</p>
        ) : (
          friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center justify-between px-4 py-3 bg-white border border-slate-300 rounded-lg"
            >
              <span className="text-dark-blue">
                {friend.country && <span className="text-slate-500">{friend.country} — </span>}
                {friend.name}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteFriend(friend.id)}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
