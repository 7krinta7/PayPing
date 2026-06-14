// AuthContext: global auth state for the app.
// On mount, rehydrates the user from the JWT in localStorage (if still valid).
// Exposes user, token, loading, login(), register(), and logout().

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import { clearToken, getToken, setToken } from '../utils/tokenStorage';

const AuthContext = createContext(null);

// Returns the decoded payload if the token exists, is well-formed, and not expired.
// Otherwise returns null and signals that the token should be cleared.
function decodeToken(token) {
  if (!token) return null;
  try {
    const payload = jwtDecode(token);
    // jwt-decode exposes `exp` in seconds since epoch.
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);
  // `loading` is true during the initial rehydration. Routes that require auth
  // must wait for it to settle before deciding to redirect, otherwise a refresh
  // on a protected page flashes the login screen.
  const [loading, setLoading] = useState(true);

  // Rehydrate auth state from localStorage on first mount.
  useEffect(() => {
    const stored = getToken();
    const payload = decodeToken(stored);
    if (stored && payload) {
      setTokenState(stored);
      setUser(payload);
    } else if (stored && !payload) {
      // Stored but expired/invalid — clean it up.
      clearToken();
    }
    setLoading(false);
  }, []);

  const handleAuthSuccess = useCallback((data) => {
    // Accept either { token } or { accessToken } from the backend.
    const newToken = data?.token || data?.accessToken;
    if (!newToken) {
      throw new Error('Auth response missing token');
    }
    const payload = decodeToken(newToken);
    if (!payload) {
      throw new Error('Received an invalid or expired token');
    }
    setToken(newToken);
    setTokenState(newToken);
    setUser(payload);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password });
      handleAuthSuccess(data);
    },
    [handleAuthSuccess]
  );

  const register = useCallback(
    async (name, email, password) => {
      const { data } = await api.post('/auth/register', { name, email, password });
      // If the backend returns a token on register, auto-login. Otherwise the
      // caller can redirect to /login.
      if (data?.token || data?.accessToken) {
        handleAuthSuccess(data);
      }
      return data;
    },
    [handleAuthSuccess]
  );

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
