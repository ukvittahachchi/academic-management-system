'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Added local error state to handle validation and specific API errors
  const [error, setError] = useState(''); 
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    
    // Validate locally first
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await login(username, password);
      // Navigation happens in auth context
    } catch (error: any) {
      // Check for specific error types based on API response
      if (error.message?.includes('locked')) {
        setError(error.message);
      } else if (error.message?.includes('inactive')) {
        setError(error.message);
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo credentials for testing
  const useDemoCredentials = (role: 'student' | 'teacher' | 'admin') => {
    setError(''); // Clear errors when filling demo data
    switch (role) {
      case 'student':
        setUsername('test_student');
        setPassword('password123');
        break;
      case 'teacher':
        setUsername('test_teacher');
        setPassword('password123');
        break;
      case 'admin':
        setUsername('test_admin');
        setPassword('password123');
        break;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      <div className="max-w-md w-full">
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <span className="text-3xl">🎓</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600">
              Sign in to your ICT Academic System account
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">👤</span>
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(''); // Clear error on typing
                  }}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Enter your username"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Students: Use your roll number as username
              </p>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔒</span>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(''); // Clear error on typing
                  }}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Enter your password"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="text-gray-400 hover:text-gray-600">
                    {showPassword ? '🙈' : '👁️'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-fade-in">
                <div className="flex items-center">
                  <span className="mr-2">❌</span>
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Demo Credentials Section */}
            <div className="pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600 mb-4">
                Want to test? Use demo credentials:
              </p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => useDemoCredentials('student')}
                  className="py-2 px-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition"
                >
                  👨‍🎓 Student
                </button>
                <button
                  type="button"
                  onClick={() => useDemoCredentials('teacher')}
                  className="py-2 px-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition"
                >
                  👩‍🏫 Teacher
                </button>
                <button
                  type="button"
                  onClick={() => useDemoCredentials('admin')}
                  className="py-2 px-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition"
                >
                  👨‍💼 Admin
                </button>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <span className="text-gray-500">
                Contact your school administrator
              </span>
            </p>
            <div className="mt-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <span className="text-yellow-600 mr-2">🔒</span>
            <div className="text-sm text-yellow-700">
              <p className="font-medium">Secure Authentication</p>
              <p className="mt-1">
                Your login credentials are protected with HTTPS and stored securely using HTTP-only cookies.
                No email required for students.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}