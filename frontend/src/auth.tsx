import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, setToken } from './api';

export type UserRole = 'super_admin' | 'admin' | 'operator' | 'viewer';

export type AuthTenant = {
  id: number;
  name: string;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  max_users: number | null;
};

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  tenant: AuthTenant | null;
};

export type RegisterPayload = {
  organization_name: string;
  ruc?: string;
  name: string;
  email: string;
  password: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isBooting: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
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

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>('/api/register', {
      method: 'POST',
      auth: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
      register,
      logout,
      refreshMe,
    }),
    [isBooting, login, logout, refreshMe, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider faltante');
  return ctx;
}

export const PLAN_LABELS: Record<string, string> = {
  trial: 'Prueba',
  basic: 'Básico',
  pro: 'Profesional',
  enterprise: 'Empresarial',
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super admin',
  admin: 'Administrador',
  operator: 'Operador',
  viewer: 'Consulta',
};
