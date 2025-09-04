import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { api } from '../services/api';

export type User = { id: string; username: string };

type AuthCtx = {
  user: User | null;
  accessToken: string | null;
  initialized: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: () => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.accessToken && parsed.user && parsed.refreshToken) {
          // Set the auth state, let the API service handle token validation/refresh
          setUser(parsed.user);
          setAccessToken(parsed.accessToken);
        } else {
          // Incomplete auth data, clear it
          localStorage.removeItem('auth');
        }
      } catch (error) {
        // Corrupted auth data, clear it
        localStorage.removeItem('auth');
      }
    }
    setInitialized(true);
  }, []);

  // Listen for localStorage changes (e.g., when auth is cleared/updated by API service)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth') {
        if (!e.newValue && user) {
          // Auth was cleared, update state
          setUser(null);
          setAccessToken(null);
        } else if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed.accessToken && parsed.user) {
              // Auth was updated (e.g., token refreshed), update state
              setUser(parsed.user);
              setAccessToken(parsed.accessToken);
            }
          } catch {
            // Invalid data, ignore
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

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

  const value = useMemo(() => ({ user, accessToken, initialized, login, register, logout }), [user, accessToken, initialized]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
