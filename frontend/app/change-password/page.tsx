'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import Image from 'next/image';
import BackgroundVideo from '@/components/ui/BackgroundVideo';

function ChangePasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Pre-fill username from URL query param if present
    const [username, setUsername] = useState(searchParams.get('username') || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!username.trim()) {
            setError('Username is required');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (currentPassword === newPassword) {
            setError('New password must be different from the old password');
            return;
        }

        setIsSubmitting(true);

        try {
            // Use the PUBLIC password change endpoint
            const response = await apiClient.changePasswordPublic(username, currentPassword, newPassword);

            if (response.success) {
                setSuccess('Password changed successfully! Redirecting to login...');

                // Redirect to login page after short delay
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to change password. Please verify your credentials.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col font-sans selection:bg-indigo-100 overflow-x-hidden relative text-white">
            {/* Background Video */}
            <BackgroundVideo src="/bg-video.mp4" />
            {/* Dark Overlay */}
            <div className="fixed top-0 left-0 w-full h-full bg-black/60 -z-10 backdrop-blur-[2px]" />

            {/* Navbar - Kept minimal and clean */}
            <nav className="w-full pt-4 px-4 sm:px-8 mb-4 absolute top-0 z-20">
                <div className="max-w-[95%] mx-auto flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2 sm:gap-3 group cursor-pointer hover:opacity-90 transition-opacity">
                        <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 bg-white/90 rounded-full flex items-center justify-center shadow-lg border border-white/20 backdrop-blur-sm group-hover:scale-105 transition-transform">
                            <Image
                                src="/logo1.png"
                                alt="Education Logo"
                                fill
                                className="object-contain p-1.5"
                                priority
                                sizes="48px"
                            />
                        </div>
                        <div className="block">
                            <h1 className="text-sm sm:text-base font-bold text-white leading-tight drop-shadow-md">
                                ICT Academic System
                            </h1>
                            <p className="text-[9px] sm:text-[10px] text-indigo-300 font-bold tracking-wide drop-shadow-sm uppercase">
                                Future Learning
                            </p>
                        </div>
                    </Link>

                    <div>
                        <Link
                            href="/login"
                            className="group relative inline-flex items-center gap-2 px-4 py-1.5 sm:px-6 sm:py-2 bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-full font-semibold text-xs sm:text-sm transition-all duration-200 backdrop-blur-md"
                        >
                            <span>Back to Login</span>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Form Container */}
            <main className="flex-grow flex items-center justify-center p-4 z-10 pt-24 pb-12">
                <div className="w-full max-w-md bg-black/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10 animate-fade-in-up">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500/20 rounded-full mb-4 border border-indigo-500/30">
                            <span className="text-3xl">🔐</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white drop-shadow-sm">Account Activation</h1>
                        <p className="text-gray-300 mt-2 text-sm">
                            Please change your initial password to continue.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1.5 drop-shadow-sm">
                                Username / Roll Number
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-white placeholder-gray-400 backdrop-blur-md"
                                    placeholder="Enter your username"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        {/* Current Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1.5 drop-shadow-sm">
                                Current Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-white placeholder-gray-400 backdrop-blur-md"
                                    placeholder="Enter current password"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1.5 drop-shadow-sm">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-white placeholder-gray-400 backdrop-blur-md"
                                    placeholder="Enter new password"
                                    required
                                    minLength={6}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1.5 drop-shadow-sm">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-white placeholder-gray-400 backdrop-blur-md"
                                    placeholder="Confirm new password"
                                    required
                                    minLength={6}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end">
                            <button
                                type="button"
                                className="text-sm text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '🙈 Hide Passwords' : '👁️ Show Passwords'}
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-200 rounded-xl text-sm flex items-start gap-2 backdrop-blur-md">
                                <span>❌</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {success && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/50 text-emerald-300 rounded-xl text-sm flex items-start gap-2 backdrop-blur-md">
                                <span>✅</span>
                                <span>{success}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-indigo-300 text-white font-bold py-3 px-4 rounded-xl transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-black shadow-lg shadow-indigo-500/30"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Updating...
                                </span>
                            ) : 'Change Password & Activate'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}

export default function ChangePasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p>Loading application...</p>
                </div>
            </div>
        }>
            <ChangePasswordContent />
        </Suspense>
    );
}
