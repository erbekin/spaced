import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps fetch with automatic JWT handling:
 * - Injects Authorization header on every request.
 * - On 401, attempts a silent token refresh via POST /api/users/refresh.
 * - Retries the original request with the new token on success.
 * - Logs the user out if the refresh fails.
 */
export function useAuthFetch() {
  const { token, user, handleLogin, handleLogout } = useAuth();

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

      const res = await makeRequest(token);
      if (res.status !== 401) return res;

      // Attempt a silent token refresh
      const refreshRes = await fetch('/api/users/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (!refreshRes.ok) {
        // Refresh failed — session is dead, log out
        await handleLogout();
        return res;
      }

      const { accessToken: newToken } = (await refreshRes.json()) as {
        accessToken: string;
      };

      // Persist the new token in context so future calls use it
      if (user) handleLogin(newToken, user);

      // Retry the original request with the new token
      return makeRequest(newToken);
    },
    [token, user, handleLogin, handleLogout],
  );

  return authFetch;
}
