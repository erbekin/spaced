import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function CreateSpace() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/spaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ name, slug }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create space');

      navigate('/spaces');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md border-2 border-gray-800 bg-white p-6 rounded shadow-sm">
      <h2 className="text-center font-bold text-lg mb-6">Create New Space</h2>

      {error && (
        <div className="mb-4 p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Space"
            className="w-full text-sm border border-gray-400 p-2 rounded focus:outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">Slug</label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="my-space"
            maxLength={64}
            className="w-full text-sm border border-gray-400 p-2 rounded focus:outline-none focus:border-black"
          />
          <p className="text-xs text-gray-400 mt-1">Lowercase only, max 64 characters.</p>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate('/spaces')}
            className="flex-1 border border-gray-400 text-gray-700 py-2 text-sm font-semibold rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gray-900 text-white py-2 text-sm font-semibold rounded hover:bg-black transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
