import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import type { HomePostDto } from '../types';

export default function EditHomePost() {
  const { token } = useAuth();
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill with existing content if updating
  useEffect(() => {
    fetch('/api/users/me/home-post', {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
      .then((res) => res.json() as Promise<HomePostDto>)
      .then((data) => {
        if (data.homePost) setContent(data.homePost.content);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/users/me/home-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
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
        <div className="grid grid-cols-2 border border-gray-400 rounded overflow-hidden h-96">
          {/* Editor */}
          <div className="flex flex-col border-r border-gray-300">
            <div className="text-xs text-gray-400 px-3 py-1.5 border-b border-gray-200 bg-gray-50">
              Editor
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write markdown here..."
              className="flex-1 p-3 text-sm resize-none focus:outline-none font-mono"
            />
          </div>

          {/* Preview */}
          <div className="flex flex-col">
            <div className="text-xs text-gray-400 px-3 py-1.5 border-b border-gray-200 bg-gray-50">
              Preview
            </div>
            <div className="flex-1 p-3 overflow-y-auto text-sm markdown-preview">
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              ) : (
                <p className="text-gray-400 text-xs">Preview will appear here...</p>
              )}
            </div>
          </div>
        </div>

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
