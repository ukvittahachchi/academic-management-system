'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, AuthState } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Debug log for auth state
  useEffect(() => {
    console.log('[AuthContext] authState:', authState);
  }, [authState]);

  const router = useRouter();
  const pathname = usePathname();

  // Ref to track if a login action just occurred to prevent redundant checks
  const justLoggedIn = useRef(false);

  // Check authentication on mount and route changes
  useEffect(() => {
    // If we just logged in, skip the check to prevent race conditions 
    // where the router pushes to a new page before the API state settles.
    if (justLoggedIn.current) {
      justLoggedIn.current = false; // Reset the flag
      return;
    }

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const refreshInterval = setInterval(() => {
      refreshToken().catch(() => {
        // Silent fail - token will be refreshed on next request
      });
    }, 14 * 60 * 1000); // Refresh every 14 minutes

    return () => clearInterval(refreshInterval);
  }, [authState.isAuthenticated]);

  // Enforce password change
  useEffect(() => {
    if (authState.isAuthenticated && authState.user?.mustChangePassword) {
      if (pathname !== '/change-password') {
        // Create a slight delay or just push to ensure state propagation
        router.push('/change-password');
      }
    }
  }, [authState.isAuthenticated, authState.user, pathname, router]);

  const checkAuth = async () => {
    console.log('[AuthContext] checkAuth called');
    try {
      // Don't set global loading state on every route change if we are already authenticated.
      // This prevents UI flickering. We only set it if we don't have a user yet.
      if (!authState.isAuthenticated) {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      }

      const response = await apiClient.checkAuth();

      if (response.authenticated && response.user) {
        setAuthState({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        // Only reset state if we were previously authenticated or checking for the first time
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication check failed',
      });
    }
  };

  const login = async (username: string, password: string) => {
    console.log('[AuthContext] login called');
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await apiClient.login({ username, password });

      if (response.success) {
        // Get user data after successful login
        const userResponse = await apiClient.getCurrentUser();

        // Set flag to prevent useEffect from re-checking immediately
        justLoggedIn.current = true;

        setAuthState({
          user: userResponse.data,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });


        if (userResponse.data.mustChangePassword) {
          router.push('/change-password');
          return;
        }

        // Redirect based on role
        switch (userResponse.data.role) {
          case 'student':
            router.push('/student');
            break;
          case 'teacher':
            router.push('/teacher');
            break;
          case 'admin':
            router.push('/admin');
            break;
          default:
            router.push('/');
        }
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
      throw error;
    }
  };

  const logout = async () => {
    console.log('[AuthContext] logout called');
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      justLoggedIn.current = false;
      router.push('/login');
    }
  };

  const refreshToken = async () => {
    console.log('[AuthContext] refreshToken called');
    try {
      await apiClient.refreshToken();
      // Token refreshed successfully, cookies updated automatically
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, logout the user
      await logout();
    }
  };

  const hasPermission = (permission: string): boolean => {
    return authState.user?.permissions.includes(permission) || false;
  };

  const hasRole = (role: string): boolean => {
    return authState.user?.role === role;
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    checkAuth,
    refreshToken,
    hasPermission,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};