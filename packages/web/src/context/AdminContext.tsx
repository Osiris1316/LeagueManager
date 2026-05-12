import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { setAdminToken, getAdminToken, clearAdminToken } from '../api/client';

interface AdminContextValue {
  isAdmin: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AdminContext = createContext<AdminContextValue>({
  isAdmin: false,
  login: () => {},
  logout: () => {},
});

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(!!getAdminToken());

  const login = useCallback((token: string) => {
    setAdminToken(token);
    setIsAdmin(true);
  }, []);

  const logout = useCallback(() => {
    clearAdminToken();
    setIsAdmin(false);
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}