/**
 * Authentication Context and Hook
 * Manages user authentication state and token
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, User } from '@/services/api';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  getProfile: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authAPI.login(email, password);
      const { token, user: userData } = response.data;

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: any) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authAPI.signup(data);
      const { token, user: userData } = response.data;

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Signup failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const getProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      // Handle both response.data.user and response.data structures
      const responseData = response.data as any;
      const userData = responseData.user || responseData;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err: any) {
      setError('Failed to fetch profile');
      throw err;
    }
  };

  const updateProfile = async (data: any) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authAPI.updateProfile(data);
      // Handle both response.data.user and response.data structures
      const responseData = response.data as any;
      const userData = responseData.user || responseData;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to update profile';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        login,
        signup,
        logout,
        getProfile,
        updateProfile,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
