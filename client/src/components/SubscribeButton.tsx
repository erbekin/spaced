import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuthFetch } from '../hooks/useAuthFetch';

type SubscriptionRef = { id: string; userId: string; spaceId: string };

type SubscribeButtonProps = {
  ownerUsername: string;
  spaceSlug: string;
  spaceId: string;
};

type State = {
  key: string; // which user + space this state belongs to
  subscribed: boolean | null; // null = could not load the status
  error: string | null;
};

/**
 * Subscribe / unsubscribe toggle for a space.
 * Renders nothing for logged-out visitors and for the space's owner.
 */
export default function SubscribeButton({
  ownerUsername,
  spaceSlug,
  spaceId,
}: SubscribeButtonProps) {
  const { user, isLoading } = useAuth();
  const authFetch = useAuthFetch();

  const username = user?.username;
  const canSubscribe = !isLoading && !!username && username !== ownerUsername;
  const key = `${username}:${spaceId}`;

  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);

  // Find out whether the current user already subscribes to this space
  useEffect(() => {
    if (!canSubscribe || !username) return;
    let cancelled = false;

    authFetch(`/api/subscriptions/${encodeURIComponent(username)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load subscription status');
        return res.json() as Promise<SubscriptionRef[]>;
      })
      .then((subs) => {
        if (cancelled) return;
        setState({ key, subscribed: subs.some((s) => s.spaceId === spaceId), error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ key, subscribed: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, canSubscribe, username, spaceId, key]);

  // Loading is derived: no state yet for the current user + space
  const current = state && state.key === key ? state : null;

  const toggle = async () => {
    if (!current || current.subscribed === null || busy) return;

    const action = current.subscribed ? 'unsubscribe' : 'subscribe';
    setBusy(true);
    setState((prev) => prev && { ...prev, error: null });

    try {
      const res = await authFetch(
        // :username is the space owner; the subscriber comes from the token
        `/api/subscriptions/${action}/${encodeURIComponent(ownerUsername)}/${encodeURIComponent(spaceSlug)}`,
        { method: 'POST' }
      );
      // 404 on unsubscribe means it's already gone, which is the state we wanted
      if (!res.ok && !(action === 'unsubscribe' && res.status === 404)) {
        throw new Error(`Failed to ${action}`);
      }
      setState((prev) => prev && { ...prev, subscribed: action === 'subscribe', error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setState((prev) => prev && { ...prev, error: message });
    } finally {
      setBusy(false);
    }
  };

  if (!canSubscribe) return null;

  // Reserve the space while loading so the header doesn't jump
  if (!current) return <span className="inline-block h-8 w-28" aria-hidden="true" />;

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      {current.subscribed === true && (
        <button
          onClick={toggle}
          disabled={busy}
          aria-label={`Unsubscribe from ${spaceSlug}`}
          className="group min-w-28 rounded-md border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
        >
          <span className="group-hover:hidden">Subscribed</span>
          <span className="hidden group-hover:inline">Unsubscribe</span>
        </button>
      )}

      {current.subscribed === false && (
        <button
          onClick={toggle}
          disabled={busy}
          className="min-w-28 rounded-md bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
        >
          Subscribe
        </button>
      )}

      {current.error && <p className="text-xs text-red-600">{current.error}</p>}
    </div>
  );
}
