import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../api/auth';

const AuthContext = createContext(null);

const ROLE_LABELS = {
  user: '일반회원',
  creator: 'Creator 회원',
  admin: '관리자',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await getMe(token);
      setUser(data.user);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  function login(token, userData) {
    localStorage.setItem('token', token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('adminReauthToken');
    sessionStorage.removeItem('adminReauthExpiry');
    setUser(null);
  }

  async function refreshUser() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const data = await getMe(token);
      setUser(data.user);
    } catch {}
  }

  const roleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : null;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, roleLabel, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
