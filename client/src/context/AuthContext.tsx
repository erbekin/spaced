import { createContext, useContext } from 'react';
import { type User } from '../types';

export type AuthFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

type AuthContextType = {
  token: string | null;
  user: User | null;
  /** True until the initial session restore (refresh + /me) has finished */
  isLoading: boolean;
  handleLogin: (token: string, user: User) => void;
  handleLogout: () => Promise<void>;
  /** fetch() with the access token attached and automatic refresh-on-401 */
  authFetch: AuthFetch;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
