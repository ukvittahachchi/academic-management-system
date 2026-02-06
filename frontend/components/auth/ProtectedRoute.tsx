'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'student' | 'teacher' | 'admin';
  allowedRoles?: string[];
  requiredPermissions?: string[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  allowedRoles = [],
  requiredPermissions = [],
  redirectTo = '/login',
}) => {
  const { isAuthenticated, isLoading, user, hasPermission, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      // Check authentication
      if (!isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      // Check role if required
      if (requiredRole && !hasRole(requiredRole)) {
        router.push('/unauthorized');
        return;
      }

      // Check allowed roles if provided
      if (allowedRoles.length > 0) {
        const hasAllowedRole = allowedRoles.some(role => hasRole(role));
        if (!hasAllowedRole) {
          router.push('/unauthorized');
          return;
        }
      }

      // Check permissions if required
      if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every(perm => hasPermission(perm));
        if (!hasAllPermissions) {
          router.push('/unauthorized');
          return;
        }
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRole, allowedRoles, requiredPermissions, router, redirectTo, hasRole, hasPermission]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show content if authenticated and authorized
  if (isAuthenticated) {
    // Check role authorization
    if (requiredRole && !hasRole(requiredRole)) {
      return null; // Will redirect in useEffect
    }

    // Check allowed roles authorization
    if (allowedRoles.length > 0) {
      const hasAllowedRole = allowedRoles.some(role => hasRole(role));
      if (!hasAllowedRole) {
        return null; // Will redirect in useEffect
      }
    }

    // Check permission authorization
    if (requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every(perm => hasPermission(perm));
      if (!hasAllPermissions) {
        return null; // Will redirect in useEffect
      }
    }

    return <>{children}</>;
  }

  return null; // Will redirect in useEffect
};

// Convenience components for specific roles
export const StudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="student">{children}</ProtectedRoute>
);

export const TeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="teacher">{children}</ProtectedRoute>
);

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>
);