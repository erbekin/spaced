import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { User } from "../types";
import { AuthContext } from "../context/AuthContext";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);

  const handleLogout = useCallback(async () => {
    await fetch('/api/users/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const handleLogin = useCallback((accessToken: string, loggedInUser: User) => {
    localStorage.setItem('token', accessToken);
    setToken(accessToken);
    setUser(loggedInUser);
  }, []);

  useEffect(() => {
    if (!token) return;

    const fetchMe = async () => {
      try {
        const res = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Session expired');
        const data: User = await res.json();
        setUser(data);
      } catch {
        handleLogout();
      }
    };

    fetchMe();
  }, [token, handleLogout]);

  return (
    <AuthContext value={{ token, user, handleLogin, handleLogout }}>
      {children}
    </AuthContext>
  );
}
