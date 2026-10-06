import { createContext, useContext } from 'react';
import { type User } from '../types';

type AuthContextType = {
  token: string | null;
  user: User | null;
  handleLogin: (token: string, user: User) => void;
  handleLogout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
