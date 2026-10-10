import { useAuth } from '../context/AuthContext';

/**
 * fetch() that attaches the access token and transparently refreshes it on 401.
 * The refresh logic lives in AuthProvider so there is a single source of truth.
 * The returned function is referentially stable.
 */
export function useAuthFetch() {
  return useAuth().authFetch;
}
