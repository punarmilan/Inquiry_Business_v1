import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { setAccessToken } from '@/api/client';
import * as authApi from '@/api/auth';
import client from '@/api/client';
import type { Admin } from '@/types';

interface AuthContextValue {
  admin: Admin | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const REFRESH_TOKEN_KEY = 'admin_refresh_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const rehydrateStarted = useRef(false);

  useEffect(() => {
    // Guards against React StrictMode's double-invoked effect (and any other
    // double-mount) firing this twice — a refresh token is single-use/rotated
    // server-side, so a second concurrent call would 409 on the now-stale token.
    if (rehydrateStarted.current) return;
    rehydrateStarted.current = true;

    const rehydrate = async () => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        setIsInitializing(false);
        return;
      }
      try {
        const { data } = await client.post('/auth/refresh', { refreshToken });
        setAccessToken(data.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        const currentAdmin = await authApi.me();
        setAdmin(currentAdmin);
      } catch {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setAccessToken(null);
      } finally {
        setIsInitializing(false);
      }
    };
    rehydrate();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setAccessToken(res.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    setAdmin(res.admin);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // best-effort; clear local session regardless
      }
    }
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setAccessToken(null);
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({ admin, isAuthenticated: !!admin, isInitializing, login, logout }),
    [admin, isInitializing, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
