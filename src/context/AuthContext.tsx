import React, { createContext, useContext, useMemo, useState } from 'react';

import { loginApi } from '@/api/service';
import { setAuthToken } from '@/api/http';

export interface AuthUser {
  username: string;
  fullName: string;
  role: string;
  permissions: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (credentials: { username: string; password: string }) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = async ({ username, password }: { username: string; password: string }) => {
    const res = await loginApi({ username, password });
    const data = res.data;
    console.log('Login response:', data);
    const user = data.data.user;
    const next: AuthUser = {
      username: user.username,
      fullName: user.fullName ?? "Unknown",
      role: user.role,
      permissions: user.permissions ?? [],
    };
    setAuthToken(data.token);
    setUser(next);
    return next;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
