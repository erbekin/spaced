import React, { useState } from 'react';
import { type User, type AuthResponse } from '../types';

type AuthCardProps = {
  onLogin: (token: string, user: User) => void;
};

export default function AuthCard({ onLogin }: AuthCardProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await fetch('/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username,
            password,
            email,
            ...(name.trim() ? { name: name.trim() } : {}),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Registration failed');
        }

        setIsRegister(false);
        setPassword('');
        setSuccessMsg('Registration successful! Please log in with your credentials.');
      } else {
        const res = await fetch('/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password }),
        });

        const raw = await res.json();
        if (!res.ok) {
          throw new Error(raw.message || 'Login failed');
        }
        const data = raw as AuthResponse;

        onLogin(data.tokens.accessToken, data.user);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md border-2 border-gray-800 bg-white p-6 rounded shadow-sm">
      <h2 className="text-center font-bold text-lg mb-4">
        {isRegister ? 'Register' : 'Login'}
      </h2>

      <div className="mb-4 flex items-center gap-2">
        <input
          id="toggle-auth"
          type="checkbox"
          checked={isRegister}
          onChange={(e) => {
            setIsRegister(e.target.checked);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className="h-4 w-4 rounded border-gray-300 text-black focus:ring-0 cursor-pointer"
        />
        <label htmlFor="toggle-auth" className="text-sm cursor-pointer select-none">
          I don't have an account.
        </label>
      </div>

      {errorMsg && (
        <div className="mb-4 p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-2.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-2 border-gray-800 p-4 rounded space-y-3">
        {isRegister && (
          <>
            <div>
              <label className="block text-xs font-semibold mb-1">Name (Optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full text-sm border border-gray-400 p-2 rounded focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full text-sm border border-gray-400 p-2 rounded focus:outline-none focus:border-black"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-semibold mb-1">Username</label>
          <input
            type="text"
            required
            autoComplete='username'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="johndoe"
            className="w-full text-sm border border-gray-400 p-2 rounded focus:outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">Password</label>
          <input
            type="password"
            required
            autoComplete='current-password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full text-sm border border-gray-400 p-2 rounded focus:outline-none focus:border-black"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-gray-900 text-white py-2 text-sm font-semibold rounded hover:bg-black transition-colors disabled:opacity-50"
        >
          {loading ? 'Processing...' : isRegister ? 'Register' : 'Login'}
        </button>
      </form>
    </div>
  );
}
