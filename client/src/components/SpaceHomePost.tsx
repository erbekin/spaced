import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { SpaceHomePostDto } from '../types';

type SpaceHomePostProps = {
  username: string;
  spaceSlug: string;
  /** Show the Create / Edit button (for the space owner). Default: false */
  canEdit?: boolean;
  /**
   * Home post data you already have. When provided (including null,
   * meaning "no home post"), nothing is fetched. Leave undefined to fetch.
   */
  homePost?: SpaceHomePostDto | null;
  /** Show the "Home post" heading. Default: true */
  showHeading?: boolean;
  /** Render nothing at all when there is no home post. Default: false */
  hideWhenEmpty?: boolean;
};

type Result = {
  key: string; // which username/spaceSlug this result belongs to
  data: SpaceHomePostDto | null;
  error: string | null;
};

const outlineButton =
  'inline-block border border-gray-400 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded hover:bg-gray-50 transition-colors';

async function fetchHomePost(username: string, spaceSlug: string) {
  const res = await fetch(
    `/api/spaces/homes/${encodeURIComponent(username)}/${encodeURIComponent(spaceSlug)}`
  );
  if (!res.ok) throw new Error('Failed to fetch home post');
  // The endpoint returns null when the space has no home post
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as SpaceHomePostDto | null;
}

export default function SpaceHomePost({
  username,
  spaceSlug,
  canEdit = false,
  homePost: providedHomePost,
  showHeading = true,
  hideWhenEmpty = false,
}: SpaceHomePostProps) {
  const key = `${username}/${spaceSlug}`;
  const hasProvidedData = providedHomePost !== undefined;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (hasProvidedData) return; // parent already gave us the data

    let cancelled = false; // ignore responses for a previous space

    fetchHomePost(username, spaceSlug)
      .then((data) => {
        if (!cancelled) setResult({ key, data, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setResult({ key, data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [username, spaceSlug, key, hasProvidedData]);

  // Loading is derived: no result yet for the current space
  const ready: Result | null = hasProvidedData
    ? { key, data: providedHomePost ?? null, error: null }
    : result && result.key === key
      ? result
      : null;
  const homePost = ready?.data ?? null;
  const editPath = `/edit-space-home-post/${encodeURIComponent(spaceSlug)}`;

  if (hideWhenEmpty && ready && !ready.error && !homePost) return null;

  return (
    <section aria-label="Space home post" className="border-b border-gray-100 pb-6">
      {(showHeading || (canEdit && homePost)) && (
        <div className="mb-3 flex items-center justify-between">
          {showHeading ? (
            <h3 className="text-sm font-semibold text-gray-900">Home post</h3>
          ) : (
            <span />
          )}
          {canEdit && homePost && (
            <Link to={editPath} className={outlineButton}>
              Edit
            </Link>
          )}
        </div>
      )}

      {!ready ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : ready.error ? (
        <p className="text-sm text-red-500">Error: {ready.error}</p>
      ) : homePost ? (
        <div className="markdown-preview text-sm leading-relaxed text-gray-800">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{homePost.content}</ReactMarkdown>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded border border-dashed border-gray-300 px-4 py-3">
          <p className="text-sm text-gray-500">This space doesn't have a home post yet.</p>
          {canEdit && (
            <Link to={editPath} className={outlineButton}>
              Create home post
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
