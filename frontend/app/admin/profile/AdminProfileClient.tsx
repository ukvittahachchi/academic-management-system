'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import StudentCard from '@/components/ui/StudentCard';
import StudentButton from '@/components/ui/StudentButton';
import { format } from 'date-fns';
import { LuUser, LuTrophy, LuLock, LuLogOut, LuShield, LuInfo, LuCheck, LuMail, LuUsers, LuServer, LuActivity } from "react-icons/lu";

export default function AdminProfileClient() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadStats = async () => {
            try {
                // Reuse admin dashboard stats if available, or just simple profile load
                const data = await apiClient.getAdminDashboard() as any;
                setStats(data.systemStats || data);
            } catch (e: any) {
                console.error("Failed to load admin stats", e);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setError(null);
        if (passwordData.new_password !== passwordData.confirm_password) {
            setError("Passwords do not match");
            return;
        }
        try {
            await apiClient.changePassword(passwordData.current_password, passwordData.new_password);
            setMessage("Password updated successfully");
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (err: any) {
            setError(err.message || 'Failed to update password');
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <ProtectedRoute allowedRoles={['admin']}>
            <div className="min-h-screen bg-gray-50/50 pb-20">
                {/* Hero Section */}
                <div className="bg-gradient-to-br from-slate-800 via-zinc-800 to-neutral-900 pb-32 relative text-white rounded-b-[3rem]">
                    <div className="max-w-7xl mx-auto px-6 py-12">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-4xl border-4 border-white/5">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-4xl font-black">{user?.username}</h1>
                                <p className="text-slate-300 flex items-center gap-2 mt-2"><LuMail /> {(user as any)?.email}</p>
                                <span className="inline-block mt-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wide border border-white/10">Administrator</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 -mt-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Stats Column */}
                    <div className="space-y-6">
                        <StudentCard title="System Overview" icon={<LuActivity className="w-6 h-6" />}>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3"><LuUsers className="text-blue-500" /> <span>Total Users</span></div>
                                    <span className="font-bold text-xl">{stats?.totalUsers || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3"><LuServer className="text-green-500" /> <span>System Uptime</span></div>
                                    <span className="font-bold text-xl">{stats?.uptime || '99%'}</span>
                                </div>
                            </div>
                        </StudentCard>

                        <StudentCard className="bg-gradient-to-br from-slate-800 to-zinc-900 text-white border-none">
                            <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><LuShield /> Checkpoint</h3>
                            <div className="space-y-2 text-slate-300 text-sm">
                                <p>Last Login: {format(new Date(), 'PPP')}</p>
                                <p>Security Level: High</p>
                                <p>Role: Super Admin</p>
                            </div>
                        </StudentCard>
                    </div>

                    {/* Settings Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <StudentCard title="Change Password" icon={<LuLock className="w-6 h-6" />}>
                            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Current Password</label>
                                    <input type="password" required className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-slate-500 transition-all font-medium"
                                        value={passwordData.current_password} onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
                                        <input type="password" required className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-slate-500 transition-all font-medium"
                                            value={passwordData.new_password} onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Confirm Password</label>
                                        <input type="password" required className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-slate-500 transition-all font-medium"
                                            value={passwordData.confirm_password} onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })} />
                                    </div>
                                </div>
                                {message && (
                                    <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm font-bold border border-green-100 flex items-center gap-2">
                                        <LuCheck className="w-4 h-4" /> {message}
                                    </div>
                                )}
                                {error && (
                                    <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2">
                                        <LuInfo className="w-4 h-4" /> {error}
                                    </div>
                                )}
                                <div className="flex justify-end">
                                    <StudentButton type="submit" className="bg-slate-800 hover:bg-slate-900 border-slate-800 text-white">Update Password</StudentButton>
                                </div>
                            </form>
                        </StudentCard>

                        <div className="flex justify-end">
                            <StudentButton variant="primary" onClick={logout} className="gap-2 bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-red-500/20">
                                <LuLogOut /> Sign Out
                            </StudentButton>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
