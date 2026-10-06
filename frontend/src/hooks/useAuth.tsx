import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import type { User } from '../types';

type AuthContextType = {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; preferredLanguage?: string }) => Promise<User>;
  logout: () => void;
};
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('mb_user') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('mb_token')));

  const clearAuth = () => {
    localStorage.removeItem('mb_token');
    localStorage.removeItem('mb_user');
    setUser(null);
  };

  useEffect(() => {
    const onExpired = () => clearAuth();
    window.addEventListener('mb-auth-expired', onExpired);
    if (!localStorage.getItem('mb_token')) {
      setLoading(false);
      return () => window.removeEventListener('mb-auth-expired', onExpired);
    }
    api<{ user: User }>('/auth/me')
      .then(r => { setUser(r.user); localStorage.setItem('mb_user', JSON.stringify(r.user)); })
      .catch(clearAuth)
      .finally(() => setLoading(false));
    return () => window.removeEventListener('mb-auth-expired', onExpired);
  }, []);

  const authFromResponse = (r: { token: string; user: User }) => {
    localStorage.setItem('mb_token', r.token);
    localStorage.setItem('mb_user', JSON.stringify(r.user));
    setUser(r.user);
    return r.user;
  };

  const value = useMemo(() => ({
    user, loading,
    login: async (email: string, password: string) => authFromResponse(await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })),
    register: async (input: { name: string; email: string; password: string; preferredLanguage?: string }) => authFromResponse(await api('/auth/register', { method: 'POST', body: JSON.stringify(input) })),
    logout: clearAuth,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const c = useContext(AuthContext); if (!c) throw new Error('useAuth must be used inside AuthProvider'); return c; }
