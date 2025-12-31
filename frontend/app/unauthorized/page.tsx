'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleGoBack = () => {
    if (user?.role === 'student') {
      router.push('/student/dashboard');
    } else if (user?.role === 'teacher') {
      router.push('/teacher/dashboard');
    } else if (user?.role === 'admin') {
      router.push('/admin/dashboard');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page. 
            This area is restricted based on your user role.
          </p>
          
          {user && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-700">
                Logged in as: <span className="font-semibold">{user.fullName}</span>
              </p>
              <p className="text-sm text-gray-600">
                Role: <span className="font-medium capitalize">{user.role}</span>
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoBack}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition"
          >
            ← Go to Your Dashboard
          </button>
          
          <button
            onClick={() => logout()}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition"
          >
            Logout and Sign In as Different User
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="w-full text-blue-600 hover:text-blue-800 font-medium py-2"
          >
            Go to Home Page
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact your school administrator.
          </p>
        </div>
      </div>
    </div>
  );
}