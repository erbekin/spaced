import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { type Space, type PaginatedResponse } from '../types';

export default function SpaceList() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchSpaces = async () => {
      try {
        const res = await fetch(`/api/spaces/${user.username}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch spaces');
        const data: PaginatedResponse<Space> = await res.json();
        setSpaces(data.items ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load spaces');
      } finally {
        setLoading(false);
      }
    };

    fetchSpaces();
  }, [user, token]);

  if (loading) return <p className="text-gray-500 text-sm">Loading...</p>;
  if (error) return <p className="text-red-500 text-sm">{error}</p>;

  return (
    <div className="w-full max-w-lg">
      <h2 className="text-xl font-bold mb-4">Spaces</h2>

      {spaces.length === 0 ? (
        <p className="text-gray-500 text-sm mb-4">No spaces yet.</p>
      ) : (
        <ul className="border border-gray-200 rounded divide-y divide-gray-200 mb-4">
          {spaces.map((space) => (
            <li key={space.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="font-medium text-gray-900">{space.name}</span>
                <span className="ml-2 text-sm italic text-gray-400">{space.slug}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/posts', { state: { space } })}
                  className="text-xs text-gray-500 border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                >
                  View Posts
                </button>
                <button
                  onClick={() => navigate(`/spaces/${space.slug}/edit`)}
                  className="text-xs text-gray-500 border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => navigate('/spaces/new')}
        className="w-full bg-gray-900 text-white py-2 text-sm font-semibold rounded hover:bg-black transition-colors"
      >
        Create New Space
      </button>
    </div>
  );
}
