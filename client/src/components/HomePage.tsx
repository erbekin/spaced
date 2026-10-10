import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import type { UserHomeInfo } from '../types';

export default function HomePage() {
  const { user: currentUser } = useAuth();
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState<UserHomeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwner = currentUser?.username === username;

  useEffect(() => {
    if (!username) return;

    let isMounted = true;
    // setLoading(true);
    // setError(null);

    fetch(`/api/users/homes/${username}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'User not found' : 'Failed to load profile');
        }
        return res.json() as Promise<UserHomeInfo>;
      })
      .then((data) => {
        if (isMounted) setProfileData(data);
      })
      .catch((err: Error) => {
        if (isMounted) {
          setError(err.message);
          setProfileData(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="w-full max-w-2xl">
        <p className="text-gray-400 text-sm">Loading profile...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="w-full max-w-2xl border border-gray-200 rounded-lg bg-white p-6">
        <p className="text-red-500 text-sm">{error ?? 'User not found'}</p>
      </div>
    );
  }

  const { user: profileUser, homePost } = profileData;

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Profile Card */}
      <div className="border border-gray-200 rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="mt-4 border-t border-gray-100 pt-4">
            <Link
              to={`/home/${profileUser.username}/spaces`}
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-black transition-colors"
            >
              View spaces <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              @{profileUser.username}
            </h1>
            {profileUser.name && (
              <p className="text-gray-500 text-sm">{profileUser.name}</p>
            )}
          </div>
          {isOwner && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">
              You
            </span>
          )}
        </div>
      </div>

      {/* Home Post / About Section */}
      <div className="border border-gray-200 rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">About</h2>
          {isOwner && homePost && (
            <button
              onClick={() => navigate(`/home/${username}/edit`)}
              className="text-xs border border-gray-300 text-gray-600 px-3 py-1 rounded hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {homePost ? (
          <div className="markdown-preview text-sm text-gray-800 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {homePost.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <p className="text-gray-500 text-sm">
              {isOwner
                ? 'You have not created a home post yet.'
                : 'No home post yet.'}
            </p>
            {isOwner && (
              <button
                onClick={() => navigate(`/home/${username}/edit`)}
                className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-green-700 transition-colors"
              >
                Create Home Post
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
