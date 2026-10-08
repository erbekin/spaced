import { useEffect, useState } from 'react';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { type Post, type PaginatedResponse, type Space } from '../types';
import { useNavigate } from 'react-router-dom';
import { dateTimeLocal } from '../utils';

type PostListProps = {
  username: string;
  space: Space;
};



export default function PostList({ username, space }: PostListProps) {
  const authFetch = useAuthFetch();
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;

    authFetch(`/api/posts/${username}/${space.slug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch posts');
        return res.json() as Promise<PaginatedResponse<Post>>;
      })
      .then((data) => {
        if (cancelled) return;
        setPosts(data.items);
        setNextCursor(data.nextCursor);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load posts');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [username, space.slug, authFetch]);

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const url = new URL(`/api/posts/${username}/${space.slug}`, window.location.origin);
      url.searchParams.set('cursor', nextCursor);
      const res = await authFetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch more posts');
      const data: PaginatedResponse<Post> = await res.json();
      setPosts((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch {
      // silently fail on load-more — existing posts remain visible
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) return <p className="text-gray-500 text-sm">Loading posts...</p>;
  if (error) return <p className="text-red-500 text-sm">{error}</p>;

  return (
    <div>
      {posts.length === 0 ? (
        <p className="text-gray-500 text-sm">No posts in this space yet.</p>
      ) : (
          <>
            <p className="text-gray-500 text-sm m-1.5">Found {posts.length} post{posts.length !== 1 ? 's' : ''}.</p>
            <ul className="border border-gray-200 rounded divide-y divide-gray-200">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{post.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {dateTimeLocal(post.createdAt)}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate(`/posts/view/${post.id}`)}
                    className="text-xs text-gray-500 border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                  >
                    View
                  </button>
                </li>
              ))}
            </ul>
        </>
      )}

      {nextCursor && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="mt-4 w-full border border-gray-300 text-gray-600 py-2 text-sm rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
