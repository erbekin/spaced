import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import { useAuthFetch } from '../hooks/useAuthFetch';
import type { HomePostDto } from '../types';

type HomePost = NonNullable<HomePostDto['homePost']>;

export default function HomePage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const isOwnProfile = user?.username === username;
  const [homePost, setHomePost] = useState<HomePost | null>(null);
  // Only fetch (and show loading) if viewing own profile
  const [loading, setLoading] = useState(isOwnProfile);

  useEffect(() => {
    if (!isOwnProfile) return;

    authFetch('/api/users/me/home-post')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<HomePostDto>;
      })
      .then((data) => setHomePost(data.homePost))
      .catch(() => setHomePost(null))
      .finally(() => setLoading(false));
  }, [authFetch, isOwnProfile]);

  if (!isOwnProfile) {
    return (
      <div className="w-full max-w-2xl">
        <p className="text-gray-500 text-sm">Other user profiles are not yet supported.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Profile card */}
      <div className="border border-gray-200 rounded bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">@{user!.username}</h1>
        {user!.name && <p className="text-gray-500 mb-3">{user!.name}</p>}
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">Email:</span> {user!.email}
        </p>
      </div>

      {/* Home post section */}
      <div className="border border-gray-200 rounded bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">About</h2>
          {!loading && homePost && (
            <button
              onClick={() => navigate(`/home/${username}/edit`)}
              className="text-xs border border-gray-300 text-gray-600 px-3 py-1 rounded hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : homePost ? (
          <div className="markdown-preview text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{homePost.content}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <p className="text-gray-500 text-sm">No home post yet.</p>
            <button
              onClick={() => navigate(`/home/${username}/edit`)}
              className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-green-700 transition-colors"
            >
              Create Home Post
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
