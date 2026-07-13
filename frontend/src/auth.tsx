import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, setToken } from './api';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isBooting: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function loadStoredToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => loadStoredToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setUser(null);
      return;
    }
    const res = await apiFetch<{ user: AuthUser }>('/api/me');
    setUser(res.user);
  }, [token]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (token) {
          await refreshMe();
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          setToken(null);
        }
      } finally {
        if (active) setIsBooting(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshMe, token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>('/api/login', {
      method: 'POST',
      auth: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, device_name: 'web' }),
    });
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch<{ message: string }>('/api/logout', { method: 'POST' });
    } finally {
      setToken(null);
      setTokenState(null);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      isBooting,
      login,
      logout,
      refreshMe,
    }),
    [isBooting, login, logout, refreshMe, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider faltante');
  return ctx;
}
