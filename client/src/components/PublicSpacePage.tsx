import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PostList from './PostList';
import type { SpaceEntityEx } from '../types';
import { dateTimeLocal } from '../utils';
import SpaceHomePost from './SpaceHomePost';
import SubscribeButton from './SubscribeButton';

export default function PublicSpacePage() {
  const { username, spaceSlug } = useParams<{ username: string; spaceSlug: string }>();

  const [space, setSpace] = useState<SpaceEntityEx | null>(null);
  const [status, setStatus] = useState<'loading' | 'found' | 'space-not-found' | 'owner-not-found' | 'error'>('loading');

  useEffect(() => {
    if (!username || !spaceSlug) return;

    let isMounted = true;

    fetch(`/api/spaces/try/${username}/${spaceSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then((json) => {
        if (!isMounted) return;
        if (json.found && json.data) {
          setSpace(json.data);
          setStatus('found');
        } else {
          setSpace(null);
          if (json.code === 'SPACE_NOT_FOUND') setStatus('space-not-found');
          else if (json.code === 'OWNER_NOT_FOUND') setStatus('owner-not-found');
          else setStatus('error');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setSpace(null);
        setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, [username, spaceSlug]); // Only re-run when the URL parameters change

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500">
        <Link
          to={`/home/${username}`}
          className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
        >
          @{username}
        </Link>
        <span className="text-gray-400">/</span>
        <Link
          to={`/home/${username}/${spaceSlug}`}
          className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
        >
          {spaceSlug}
        </Link>
      </nav>

      {/* Content Cards */}
      <div className="border border-gray-200 rounded-xl bg-white p-6 shadow-sm">
        {status === 'loading' && (
          <p className="text-sm text-gray-400 py-6 text-center">Loading space...</p>
        )}

        {status === 'error' && (
          <div className="text-center py-8 space-y-2">
            <p className="text-sm font-semibold text-red-600">Failed to load space</p>
            <p className="text-xs text-gray-400">Please check your network connection and try again.</p>
          </div>
        )}

        {status === 'space-not-found' && (
          <div className="text-center py-8 space-y-2">
            <p className="text-base font-semibold text-gray-800">Space not found</p>
            <p className="text-xs text-gray-500">
              The space <span className="font-mono text-gray-700">/{spaceSlug}</span> does not exist under @{username}.
            </p>
            <div className="pt-2">
              <Link
                to={`/home/${username}`}
                className="inline-block text-xs font-medium text-gray-900 underline hover:text-black"
              >
                Back to @{username}'s home
              </Link>
            </div>
          </div>
        )}

        {status === 'owner-not-found' && (
          <div className="text-center py-8 space-y-2">
            <p className="text-base font-semibold text-gray-800">Owner not found</p>
            <p className="text-xs text-gray-500">
              The owner <span className="font-mono text-gray-700">@{username}</span> does not exist.
            </p>
            <div className="pt-2">
              <Link
                to={`/`}
                className="inline-block text-xs font-medium text-gray-900 underline hover:text-black"
              >
                Back to home
              </Link>
            </div>
          </div>
        )}

        {status === 'found' && space && (
          <div className="space-y-6">
            <header className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {space.name}
                </h1>
                <div className="mt-2.5 flex items-center gap-2 text-xs text-gray-500">
                  <time dateTime={dateTimeLocal(space.createdAt, false)}>
                    {dateTimeLocal(space.createdAt, false)}
                  </time>
                </div>
              </div>

              <SubscribeButton
                ownerUsername={space.owner.username}
                spaceSlug={space.slug}
                spaceId={space.id}
              />
            </header>

            <SpaceHomePost
              username={space.owner.username}
              spaceSlug={space.slug}
              homePost={
                space.spaceHomePost
                  ? { spaceId: space.id, ...space.spaceHomePost }
                  : null
              }
              showHeading={false}
              hideWhenEmpty
            />
            <PostList username={space.owner.username} spaceSlug={space.slug} />
          </div>
        )}
      </div>
    </div>
  );
}
