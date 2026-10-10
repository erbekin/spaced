import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { type SpaceEntity, type PaginatedResponse } from '../types';
import SpaceSelector from './SpaceSelector';
import PostList from './PostList';
import SpaceHomePost from './SpaceHomePost';

type LocationState = { space?: SpaceEntity };

export default function OwnPostsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [spaces, setSpaces] = useState<SpaceEntity[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);

  // Restore selected space when navigating back from CreatePost
  const [currentSpace, setCurrentSpace] = useState<SpaceEntity | null>(
    (location.state as LocationState | null)?.space ?? null
  );

  useEffect(() => {
    if (!user) return;

    fetch(`/api/spaces/${user.username}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch spaces');
        return res.json() as Promise<PaginatedResponse<SpaceEntity>>;
      })
      .then((data) => setSpaces(data.items ?? []))
      .catch(() => {})
      .finally(() => setLoadingSpaces(false));
  }, [user]);

  const handleCreatePost = () => {
    if (!currentSpace) return;
    navigate('/posts/new', { state: { space: currentSpace } });
  };

  return (
    <div className="w-full max-w-2xl">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Current Space:</span>
          {loadingSpaces ? (
            <span className="text-gray-400">Loading...</span>
          ) : (
            <SpaceSelector
              spaces={spaces}
              value={currentSpace}
              onChange={setCurrentSpace}
            />
          )}
        </div>
        <button
          onClick={handleCreatePost}
          disabled={!currentSpace}
          className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Create New Post
        </button>
      </div>

      {/* Content */}
      {!currentSpace ? (
        <div className="border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm px-4 py-3 rounded">
          Select a space above to view its posts.
        </div>
      ) : (
        <div className="space-y-8">
          <SpaceHomePost
            key={`home-${currentSpace.id}`}
            username={user!.username}
            spaceSlug={currentSpace.slug}
            canEdit
          />
          <PostList
            key={`posts-${currentSpace.id}`}
            username={user!.username}
            spaceSlug={currentSpace.slug}
          />
        </div>
      )}
    </div>
  );
}
