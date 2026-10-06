import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import type { Space } from '../types';

type LocationState = { space?: Space };

export default function CreatePost() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const space = (location.state as LocationState | null)?.space;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!space || !user) {
    return <Navigate to="/posts" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/posts/${user.username}/${space.slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ title, content }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create post');

      // navigate back, restoring the current space selection
      navigate('/posts', { state: { space } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl">
      <h2 className="text-xl font-bold mb-1">New Post</h2>
      <p className="text-sm text-gray-500 mb-6">
        in <span className="italic">{space.name}</span>
      </p>

      {error && (
        <div className="mb-4 p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
            className="w-full text-sm border border-gray-400 p-2 rounded focus:outline-none focus:border-black"
          />
        </div>

        <div>
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
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate('/posts', { state: { space } })}
            className="flex-1 border border-gray-400 text-gray-700 py-2 text-sm font-semibold rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="flex-1 bg-gray-900 text-white py-2 text-sm font-semibold rounded hover:bg-black transition-colors disabled:opacity-50"
          >
            {loading ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </form>
    </div>
  );
}
