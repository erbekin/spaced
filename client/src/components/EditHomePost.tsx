import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthFetch } from '../hooks/useAuthFetch';
import type { HomePostDto } from '../types';
import ContentEditor from './ContentEditor';

export default function EditHomePost() {
  const authFetch = useAuthFetch();
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill with existing content if updating
  useEffect(() => {
    authFetch('/api/users/me/home-post')
      .then((res) => res.json() as Promise<HomePostDto>)
      .then((data) => {
        if (data.homePost) setContent(data.homePost.content);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authFetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await authFetch('/api/users/me/home-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save home post');
      }

      navigate(`/home/${username}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-gray-500 text-sm">Loading...</p>;

  return (
    <div className="w-full max-w-5xl">
      <h2 className="text-xl font-bold mb-1">Edit Home Post</h2>
      <p className="text-sm text-gray-500 mb-6">
        This post will be displayed on your profile page.
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
            onClick={() => navigate(`/home/${username}`)}
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
