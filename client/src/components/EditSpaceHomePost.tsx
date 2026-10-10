import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthFetch } from '../hooks/useAuthFetch';
import type { SpaceHomePostDto } from '../types';
import ContentEditor from './ContentEditor';

export default function EditSpaceHomePost() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const navigate = useNavigate();
  const location = useLocation();

  const username = user?.username;
  const endpoint =
    username && spaceSlug
      ? `/api/spaces/homes/${encodeURIComponent(username)}/${encodeURIComponent(spaceSlug)}`
      : null;

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Go back to where the user came from (keeps OwnPostsPage's selected space).
  // If this page was opened directly, fall back to the posts page.
  const goBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/posts');
  };

  // Pre-fill with the existing home post, if there is one
  useEffect(() => {
    if (!endpoint) return;
    let cancelled = false;

    authFetch(endpoint)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load home post');
        const text = await res.text(); // empty body / null => no home post yet
        return (text ? JSON.parse(text) : null) as SpaceHomePostDto | null;
      })
      .then((data) => {
        if (!cancelled && data) setContent(data.content);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, endpoint]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endpoint) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to save home post');
      }

      goBack();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (!endpoint) return <p className="text-gray-500 text-sm">Space not available.</p>;
  if (loading) return <p className="text-gray-500 text-sm">Loading...</p>;
  if (loadError) return <p className="text-red-500 text-sm">Error: {loadError}</p>;

  return (
    <div className="w-full max-w-5xl">
      <h2 className="text-xl font-bold mb-1">Edit Space Home Post</h2>
      <p className="text-sm text-gray-500 mb-6">
        This post will be displayed at the top of{' '}
        <span className="font-mono text-gray-700">/{spaceSlug}</span>.
      </p>

      {error && (
        <div className="mb-4 p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <ContentEditor value={content} onChange={setContent} />

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={goBack}
            className="flex-1 border border-gray-400 text-gray-700 py-2 text-sm font-semibold rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="flex-1 bg-gray-900 text-white py-2 text-sm font-semibold rounded hover:bg-black transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
