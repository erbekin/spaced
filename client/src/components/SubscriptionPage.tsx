import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AuthFetch } from '../context/AuthContext';
import { useAuthFetch } from '../hooks/useAuthFetch';
import type { SubscriptionDetail } from '../types';

type SubscriptionRef = { id: string; userId: string; spaceId: string };

type DetailsResponse = {
  count: number;
  found: SubscriptionDetail[];
  notFound: string[];
};

type Result = {
  key: string; // which user this result belongs to
  items: SubscriptionDetail[];
  error: string | null;
};

const DETAILS_BATCH_SIZE = 500; // POST /subscriptions/details limit

async function loadSubscriptions(
  authFetch: AuthFetch,
  username: string
): Promise<SubscriptionDetail[]> {
  // 1. The user's subscriptions (ids only)
  const listRes = await authFetch(`/api/subscriptions/${encodeURIComponent(username)}`);
  if (!listRes.ok) throw new Error('Failed to load subscriptions');
  const refs = (await listRes.json()) as SubscriptionRef[];
  if (refs.length === 0) return [];

  // 2. Resolve ids to space names, in batches of 500
  const ids = refs.map((r) => r.id);
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += DETAILS_BATCH_SIZE) {
    batches.push(ids.slice(i, i + DETAILS_BATCH_SIZE));
  }

  const responses = await Promise.all(
    batches.map(async (batch) => {
      const res = await authFetch('/api/subscriptions/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch), // the body is a plain JSON array of ids
      });
      if (!res.ok) throw new Error('Failed to load subscription details');
      return (await res.json()) as DetailsResponse;
    })
  );

  return responses
    .flatMap((r) => r.found ?? [])
    .sort((a, b) => a.space.name.localeCompare(b.space.name));
}

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const username = user?.username;

  const [result, setResult] = useState<Result | null>(null);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;

    loadSubscriptions(authFetch, username)
      .then((items) => {
        if (!cancelled) setResult({ key: username, items, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setResult({ key: username, items: [], error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, username]);

  // Loading is derived: no result yet for the current user
  const ready = result && result.key === username ? result : null;

  const unsubscribe = async (sub: SubscriptionDetail) => {
    setActionError(null);
    setRemoving((prev) => new Set(prev).add(sub.id));

    try {
      const res = await authFetch(
        // :username is the space owner; the subscriber comes from the token
        `/api/subscriptions/unsubscribe/${encodeURIComponent(sub.space.owner.username)}/${encodeURIComponent(sub.space.slug)}`,
        { method: 'POST' }
      );
      // 404 means it's already gone, so removing it from the list is correct
      if (!res.ok && res.status !== 404) throw new Error('Failed to unsubscribe');

      setResult((prev) =>
        prev && { ...prev, items: prev.items.filter((i) => i.id !== sub.id) }
      );
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(sub.id);
        return next;
      });
    }
  };

  return (
    <div className="w-full max-w-lg space-y-4">
      <div className="pb-2 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Subscriptions</h2>
        <p className="text-xs text-gray-400 mt-0.5">Spaces you are subscribed to</p>
      </div>

      {actionError && (
        <div className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
          {actionError}
        </div>
      )}

      {!ready ? (
        <p className="text-gray-400 text-sm py-4">Loading subscriptions...</p>
      ) : ready.error ? (
        <p className="text-red-500 text-sm py-4">{ready.error}</p>
      ) : ready.items.length === 0 ? (
        <div className="text-center py-10 border border-gray-200 rounded-lg bg-white">
          <p className="text-gray-500 text-sm">You haven't subscribed to any spaces yet.</p>
        </div>
      ) : (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-200 bg-white shadow-sm overflow-hidden">
          {ready.items.map((sub) => (
            <li
              key={sub.id}
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <Link
                  to={`/home/${sub.space.owner.username}/spaces/${sub.space.slug}`}
                  className="block truncate font-medium text-gray-900 hover:underline"
                >
                  {sub.space.name}
                </Link>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  /{sub.space.slug} · @{sub.space.owner.username}
                </p>
              </div>

              <button
                onClick={() => unsubscribe(sub)}
                disabled={removing.has(sub.id)}
                className="shrink-0 border border-gray-300 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {removing.has(sub.id) ? 'Removing...' : 'Unsubscribe'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
