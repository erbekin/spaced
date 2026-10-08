import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthFetch } from '../hooks/useAuthFetch';

type SpaceDetail = {
  id: string;
  name: string;
  slug: string;
};

/**
 * Edit name and slug for a space.
 * Shows a form with inputs for the space's name and slug.
 * Displays error message at the top of the form.
 */
export default function EditSpace() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user || !slug) return;

    const fetchSpace = async () => {
      try {
        const res = await authFetch(`/api/spaces/${user.username}/${slug}`);
        if (!res.ok) throw new Error('Space not found');
        const data: SpaceDetail = await res.json();
        setName(data.name);
        setNewSlug(data.slug);
      } catch (err: unknown) {
        setFetchError(err instanceof Error ? err.message : 'Failed to load space');
      } finally {
        setLoading(false);
      }
    };

    fetchSpace();
  }, [user, slug, authFetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const res = await authFetch(`/api/spaces/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug: newSlug }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update space');

      navigate('/spaces');
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await authFetch(`/api/spaces/${slug}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete space');
      }
      navigate('/spaces');
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
      setDeleting(false);
    }
  };

  if (loading) return <p className="text-gray-500 text-sm">Loading...</p>;

  if (fetchError) return (
    <div className="w-full max-w-md">
      <p className="text-red-500 text-sm mb-4">{fetchError}</p>
      <button onClick={() => navigate('/spaces')} className="text-sm text-gray-600 hover:text-gray-900">
        ← Back to spaces
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-md border-2 border-gray-800 bg-white p-6 rounded shadow-sm">
      <h2 className="text-center font-bold text-lg mb-6">Edit Space</h2>

      {submitError && (
        <div className="mb-4 p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
          {submitError}
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
            className="w-full text-sm border border-gray-400 p-2 rounded focus:outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">Slug</label>
          <input
            type="text"
            required
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value.toLowerCase())}
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
            disabled={submitting || deleting}
            className="flex-1 bg-gray-900 text-white py-2 text-sm font-semibold rounded hover:bg-black transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="pt-6 border-t border-gray-200 mt-4">
          <button
            type="button"
            disabled={deleting || submitting}
            onClick={handleDelete}
            className="w-full border border-red-300 text-red-600 py-2 text-sm font-semibold rounded hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete Space'}
          </button>
        </div>
      </form>
    </div>
  );
}
