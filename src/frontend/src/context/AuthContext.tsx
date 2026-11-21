import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginResponse } from '../types';
import { apiClient } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: LoginResponse) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  isLoading: true
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('csb_token');
    const savedUser = localStorage.getItem('csb_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify with /api/auth/me
        apiClient.get<User>('/auth/me')
          .then(res => {
            setUser(res.data);
            localStorage.setItem('csb_user', JSON.stringify(res.data));
          })
          .catch(() => {
            logout();
          })
          .finally(() => {
            setIsLoading(false);
          });
        return;
      } catch {
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  const login = (data: LoginResponse) => {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('csb_token', data.token);
    localStorage.setItem('csb_user', JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('csb_token');
    localStorage.removeItem('csb_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
