import { useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Module-level lock shared by all simultaneous requests
let activeRefreshPromise: Promise<string | null> | null = null;

export function useAuthFetch() {
  const { token, user, handleLogin, handleLogout } = useAuth();

  // Keep mutable references to prevent recreating authFetch when state updates
  const tokenRef = useRef(token);
  const userRef = useRef(user);
  const handleLoginRef = useRef(handleLogin);
  const handleLogoutRef = useRef(handleLogout);

  useEffect(() => {
    tokenRef.current = token;
    userRef.current = user;
    handleLoginRef.current = handleLogin;
    handleLogoutRef.current = handleLogout;
  });

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const makeRequest = (accessToken: string | null) =>
        fetch(input, {
          ...init,
          credentials: 'include',
          headers: {
            ...init?.headers,
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });

      // 1. Initial attempt
      const res = await makeRequest(tokenRef.current);
      if (res.status !== 401) return res;

      // 2. Concurrency-safe token refresh
      if (!activeRefreshPromise) {
        activeRefreshPromise = (async () => {
          try {
            const refreshRes = await fetch('/api/users/refresh', {
              method: 'POST',
              credentials: 'include',
            });

            if (!refreshRes.ok) {
              await handleLogoutRef.current();
              return null;
            }

            const { accessToken: newToken } = (await refreshRes.json()) as {
              accessToken: string;
            };

            if (userRef.current) {
              handleLoginRef.current(newToken, userRef.current);
            }
            tokenRef.current = newToken;
            return newToken;
          } catch {
            await handleLogoutRef.current();
            return null;
          } finally {
            activeRefreshPromise = null;
          }
        })();
      }

      const freshToken = await activeRefreshPromise;
      if (!freshToken) return res;

      // 3. Retry original request with newly acquired token
      return makeRequest(freshToken);
    },
    [] // Stable reference across renders
  );

  return authFetch;
}
