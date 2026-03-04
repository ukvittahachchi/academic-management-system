'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import BackgroundVideo from '@/components/ui/BackgroundVideo';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(username, password);
    } catch (error: any) {
      if (error.message?.includes('locked')) {
        setError(error.message);
      } else if (error.message?.includes('inactive')) {
        setError(error.message);
      } else if (error.message?.includes('Password change required')) {
        setError('Please change your password to activate your account.');
        router.push(`/change-password?username=${encodeURIComponent(username)}`);
        return;
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-indigo-100 pb-8 overflow-x-hidden relative text-gray-900">
      {/* Background Video */}
      <BackgroundVideo src="/bg-video.mp4" />
      {/* Dark Overlay */}
      <div className="fixed top-0 left-0 w-full h-full bg-black/50 -z-10" />

      {/* Navbar - Simplified for Login */}
      <nav className="w-full pt-4 px-4 sm:px-8 mb-4 relative z-10 hidden sm:block">
        <div className="max-w-[95%] mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 bg-white/90 rounded-full flex items-center justify-center shadow-lg border border-white/20 backdrop-blur-sm group-hover:bg-white transition-all">
              <Image
                src="/logo1.png"
                alt="Education Logo"
                fill
                className="object-contain p-1.5 sm:p-2"
                priority
                sizes="(max-width: 640px) 40px, 48px"
              />
            </div>
            <div className="block">
              <h1 className="text-sm sm:text-xl font-bold text-white leading-tight drop-shadow-md group-hover:text-indigo-200 transition-colors">
                ICT Academic System
              </h1>
            </div>
          </Link>
          <div>
            <Link
              href="/"
              className="text-white hover:text-indigo-200 text-sm font-medium transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Login Area */}
      <main className="flex-grow px-4 flex items-center justify-center relative z-10 mt-8 sm:mt-0">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Glassmorphic Login Card */}
          <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 border border-white/20 rounded-full mb-4 shadow-inner">
                <span className="text-3xl">🎓</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-sm">
                Welcome Back
              </h1>
              <p className="text-indigo-200 text-sm">
                Sign in to your official portal
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Input */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-200 mb-2 drop-shadow-sm">
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
                      if (error) setError('');
                    }}
                    className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all backdrop-blur-sm"
                    placeholder="Enter your username"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <p className="mt-1 text-xs text-indigo-300 opacity-80">
                  Students: Use your roll number
                </p>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2 drop-shadow-sm">
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
                      if (error) setError('');
                    }}
                    className="block w-full pl-10 pr-10 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all backdrop-blur-sm"
                    placeholder="Enter your password"
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="text-gray-400 hover:text-white transition-colors">
                      {showPassword ? '🙈' : '👁️'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg backdrop-blur-sm animate-fade-in text-sm flex items-center">
                  <span className="mr-2">❌</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-black"
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
            </form>

            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <div className="space-y-3">
                <Link href="/change-password" className="text-sm font-medium text-indigo-300 hover:text-indigo-200 transition-colors">
                  First time logging in? Change Password
                </Link>
                <div className="text-xs text-gray-400">
                  Don't have an account? Contact administrator
                </div>
              </div>
            </div>
          </div>

          {/* Secure Portal Indicator */}
          <div className="mt-6 flex items-center justify-center text-xs text-gray-400 gap-2">
            <span>🔒</span>
            <span>Secure Official Portal • Authorized Access Only</span>
          </div>

          <div className="mt-4 flex items-center justify-center sm:hidden">
            <Link
              href="/"
              className="text-gray-400 hover:text-white text-xs font-medium transition-colors border-b border-gray-600/50 pb-0.5"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}