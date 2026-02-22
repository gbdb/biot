import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isAuthenticated, logout as apiLogout } from '@/api/client';

type AuthContextType = {
  authenticated: boolean | null;
  setAuthenticated: (v: boolean) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticatedState] = useState<boolean | null>(null);

  const checkAuth = useCallback(() => {
    return isAuthenticated()
      .then(setAuthenticatedState)
      .catch(() => setAuthenticatedState(false));
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const setAuthenticated = useCallback((v: boolean) => {
    setAuthenticatedState(v);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setAuthenticatedState(false);
  }, []);

  return (
    <AuthContext.Provider value={{ authenticated, setAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
