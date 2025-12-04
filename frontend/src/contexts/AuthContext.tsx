'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, getAccessToken, clearTokens, UserResponse, TenantInfo } from '@/lib/api';

interface AuthState {
  user: UserResponse | null;
  tenant: TenantInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, subdomain: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check auth status on mount
  const checkAuth = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setState({
        user: null,
        tenant: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return;
    }

    try {
      const { user, tenant } = await authApi.me();
      setState({
        user,
        tenant,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      clearTokens();
      setState({
        user: null,
        tenant: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string, subdomain: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { user } = await authApi.login({
        email,
        password,
        tenant_subdomain: subdomain,
      });
      
      // Fetch full user/tenant info
      const { tenant } = await authApi.me();
      
      setState({
        user,
        tenant,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setState({
        user: null,
        tenant: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const refresh = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook for protecting routes - redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo = '/auth/login') {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  return { isLoading, isAuthenticated };
}