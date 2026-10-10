import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { type Space, type PaginatedResponse } from '../types';

export default function SpaceList() {
  const { user: currentUser } = useAuth();
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const targetUsername = username || currentUser?.username;
  const isOwner = !!(currentUser && targetUsername && currentUser.username === targetUsername);

  const [spaces, setSpaces] = useState<Space[]>([]);
  // Only start in a loading state if there is actually a user to fetch for
  const [loading, setLoading] = useState(() => Boolean(targetUsername));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If there is no user, do nothing (loading is already false)
    if (!targetUsername) return;

    let isMounted = true;

    fetch(`/api/spaces/${targetUsername}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch spaces');
        return res.json() as Promise<PaginatedResponse<Space>>;
      })
      .then((data) => {
        if (isMounted) {
          setSpaces(data.items ?? []);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load spaces');
          setSpaces([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [targetUsername]);

  if (!targetUsername) {
    return (
      <div className="w-full max-w-lg border border-gray-200 rounded-lg bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">
          No user specified.{' '}
          <Link to="/login" className="text-gray-900 font-semibold underline">
            Log in
          </Link>{' '}
          to view your spaces.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg space-y-4">
      {/* Header with Title and Create Action */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {isOwner ? 'My Spaces' : `@${targetUsername}'s Spaces`}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Listing spaces published by @{targetUsername}
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => navigate('/spaces/new')}
            className="bg-gray-900 text-white px-3.5 py-1.5 text-xs font-semibold rounded-md hover:bg-black transition-colors shrink-0"
          >
            Create New Space
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm py-4">Loading spaces...</p>
      ) : error ? (
        <p className="text-red-500 text-sm py-4">{error}</p>
      ) : spaces.length === 0 ? (
        <div className="text-center py-10 border border-gray-200 rounded-lg bg-white">
          <p className="text-gray-500 text-sm">No spaces found.</p>
        </div>
      ) : (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-200 bg-white shadow-sm overflow-hidden">
          {spaces.map((space) => (
            <li
              key={space.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
            >
              <div className="min-w-0 flex-1 pr-4">
                <p className="font-medium text-gray-900 truncate">{space.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  /{space.slug}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {/* Edit button (owner only) */}
                {isOwner && (
                  <button
                    onClick={() => navigate(`/spaces/${space.slug}/edit`)}
                    aria-label={`Edit ${space.name}`}
                    className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                )}

                {/* Arrow navigation button */}
                <button
                  onClick={() => navigate(`/home/${targetUsername}/spaces/${space.slug}`)}
                  aria-label={`Open ${space.name}`}
                  className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 transform group-hover:translate-x-0.5 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
