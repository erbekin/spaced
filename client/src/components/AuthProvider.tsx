import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '../types';
import { AuthContext, type AuthFetch } from '../context/AuthContext';

export default function AuthProvider({ children }: { children: ReactNode }) {
  // The access token lives in memory only. On every page load the session is
  // restored through the refresh cookie, so an expired token can never strand
  // the user on the login page.
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ref mirrors the token so authFetch can stay referentially stable
  const tokenRef = useRef<string | null>(null);
  // Single-flight lock: simultaneous 401s share one refresh request
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const applyToken = useCallback((next: string | null) => {
    tokenRef.current = next;
    setToken(next);
  }, []);

  const clearSession = useCallback(() => {
    applyToken(null);
    setUser(null);
  }, [applyToken]);

  const handleLogin = useCallback(
    (accessToken: string, loggedInUser: User) => {
      applyToken(accessToken);
      setUser(loggedInUser);
    },
    [applyToken]
  );

  const handleLogout = useCallback(async () => {
    clearSession();
    try {
      await fetch('/api/users/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Offline or server error: the local session is already cleared
    }
  }, [clearSession]);

  /**
   * Exchange the refresh cookie for a new access token.
   * - resolves with the token on success
   * - resolves with null if the refresh token was rejected (session is over)
   * - rejects on network/server errors (session may still be valid)
   */
  const refresh = useCallback((): Promise<string | null> => {
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = (async () => {
        try {
          const res = await fetch('/api/users/refresh', {
            method: 'POST',
            credentials: 'include',
          });
          if (res.status === 401 || res.status === 403) return null;
          if (!res.ok) throw new Error('Token refresh failed');

          const { accessToken } = (await res.json()) as { accessToken: string };
          applyToken(accessToken);
          return accessToken;
        } finally {
          refreshPromiseRef.current = null;
        }
      })();
    }
    return refreshPromiseRef.current;
  }, [applyToken]);

  const authFetch = useCallback<AuthFetch>(
    async (input, init) => {
      const makeRequest = (accessToken: string | null) => {
        const headers = new Headers(init?.headers);
        if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
        return fetch(input, { ...init, credentials: 'include', headers });
      };

      const usedToken = tokenRef.current;
      const res = await makeRequest(usedToken);
      if (res.status !== 401) return res;

      // Another request already refreshed the token while this one was in flight
      if (tokenRef.current && tokenRef.current !== usedToken) {
        return makeRequest(tokenRef.current);
      }

      let freshToken: string | null;
      try {
        freshToken = await refresh();
      } catch {
        return res; // network/server error: don't log the user out
      }

      if (!freshToken) {
        await handleLogout(); // refresh token rejected: session is really over
        return res;
      }

      return makeRequest(freshToken);
    },
    [refresh, handleLogout]
  );

  // Restore the session on page load
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const accessToken = await refresh();
        if (!accessToken) return; // no valid session: stay logged out

        const res = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to load user');

        const me = (await res.json()) as User;
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh, clearSession]);

  const value = useMemo(
    () => ({ token, user, isLoading, handleLogin, handleLogout, authFetch }),
    [token, user, isLoading, handleLogin, handleLogout, authFetch]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
