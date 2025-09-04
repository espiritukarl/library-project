import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { api } from '../services/api';

export type User = { id: string; username: string };

type AuthCtx = {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed.user);
      setAccessToken(parsed.accessToken);
    }
  }, []);

  const save = (u: User, token: string, refreshToken?: string) => {
    setUser(u);
    setAccessToken(token);
    localStorage.setItem('auth', JSON.stringify({ user: u, accessToken: token, refreshToken }));
  };

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    save(res.user, res.accessToken, res.refreshToken);
  };
  const register = async () => {
    throw new Error('Registration disabled');
  };
  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('auth');
  };

  const value = useMemo(() => ({ user, accessToken, login, register, logout }), [user, accessToken]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
