'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import QuickActionCard from '@/components/teacher/QuickActionCard';
import {
    LuUsers,
    LuBookOpen,
    LuFileText,
    LuSettings,
    LuActivity,
    LuShieldAlert,
    LuTrendingUp,
    LuServer
} from 'react-icons/lu';
import { format } from 'date-fns';

export default function ClientAdminDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                setLoading(true);
                // Currently using the generic dashboard endpoint or specific one if available
                const response = await apiClient.getAdminDashboard() as any;
                setDashboardData(response.dashboard || response); // Handle wrapped data
            } catch (err: any) {
                console.error("Dashboard Load Error:", err);
                // Fallback for now if endpoint isn't fully ready
                setDashboardData({
                    systemStats: {
                        totalUsers: 120,
                        activeModules: 15,
                        uptime: '98%',
                        storageUsed: '45%'
                    },
                    recentActivity: []
                });
                // setError(err.message || 'Failed to load dashboard');
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, []);

    return (
        <ProtectedRoute allowedRoles={['admin']}>
            <div className="min-h-screen bg-gray-50/50 pb-20">
                {/* Premium Hero Section */}
                <div className="bg-gradient-to-br from-slate-800 via-zinc-800 to-neutral-900 pb-32 relative overflow-hidden shadow-2xl shadow-slate-900/20 isolate text-white rounded-b-[3rem]">
                    {/* Abstract Shapes */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-500/10 rounded-full blur-2xl opacity-50 pointer-events-none"></div>

                    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-black text-white flex items-center gap-4 mb-3 tracking-tight">
                                    Admin Portal <span className="text-slate-400 font-light text-3xl">| {user?.username}</span>
                                </h1>
                                <p className="text-slate-300 text-lg font-medium max-w-xl leading-relaxed">
                                    Manage your institution's digital infrastructure and users.
                                </p>
                            </div>

                            {/* Stats Cards in Hero */}
                            <div className="flex gap-4">
                                <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl font-black text-white border border-white/10 shadow-lg flex flex-col items-center min-w-[140px]">
                                    <div className="text-3xl flex items-center gap-2">
                                        {loading ? (
                                            <div className="h-8 w-16 bg-white/20 animate-pulse rounded"></div>
                                        ) : (
                                            <>
                                                <LuUsers className="text-blue-400" /> {dashboardData?.systemStats?.totalUsers || 0}
                                            </>
                                        )}
                                    </div>
                                    <span className="text-xs uppercase tracking-widest text-slate-400">Total Users</span>
                                </div>
                                <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl font-black text-white border border-white/10 shadow-lg flex flex-col items-center min-w-[140px]">
                                    <div className="text-3xl flex items-center gap-2">
                                        {loading ? (
                                            <div className="h-8 w-16 bg-white/20 animate-pulse rounded"></div>
                                        ) : (
                                            <>
                                                <LuServer className="text-green-400" /> {dashboardData?.systemStats?.uptime || '98%'}
                                            </>
                                        )}
                                    </div>
                                    <span className="text-xs uppercase tracking-widest text-slate-400">System Uptime</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Container - Pulling up over Hero */}
                <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-20 relative z-20">

                    {/* Quick Access Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
                        <QuickActionCard
                            title="User Management"
                            description="Students & Teachers"
                            icon={LuUsers}
                            color="blue"
                            onClick={() => router.push('/admin/users')}
                        />
                        <QuickActionCard
                            title="Module Manager"
                            description="Course Content"
                            icon={LuBookOpen}
                            color="purple"
                            onClick={() => router.push('/admin/modules')}
                        />
                        <QuickActionCard
                            title="System Logs"
                            description="Audit & Security"
                            icon={LuShieldAlert}
                            color="orange"
                            onClick={() => router.push('/admin/audit-logs')}
                        />
                        <QuickActionCard
                            title="Global Settings"
                            description="App Configuration"
                            icon={LuSettings}
                            color="indigo"
                            onClick={() => router.push('/admin/settings')}
                        />

                    </div>

                    {/* Dashboard Views */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-[fade-in_0.5s_ease-out]">

                        {/* Main Activity Column */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Recent System Activity */}
                            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">Recent System Activity</h3>
                                        <p className="text-sm text-gray-500">Latest actions performed by users</p>
                                    </div>
                                    <button onClick={() => router.push('/admin/audit-logs')} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-full transition-colors">
                                        View Full Log
                                    </button>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {loading ? (
                                        <div className="p-6 space-y-4">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="flex gap-4 animate-pulse">
                                                    <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : dashboardData?.recentActivity?.length > 0 ? (
                                        dashboardData.recentActivity.map((activity: any, index: number) => (
                                            <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-start gap-4">
                                                    <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 text-gray-600`}>
                                                        <LuActivity />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between">
                                                            <h4 className="font-bold text-gray-900">{activity.action || 'System Action'}</h4>
                                                            <span className="text-xs font-medium text-gray-400">
                                                                {activity.time || 'Just now'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1">{activity.details || 'Action detail'}</p>
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium capitalize">
                                                                {activity.type || 'System'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-12 text-center">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                                <LuActivity className="w-8 h-8" />
                                            </div>
                                            <h3 className="text-gray-900 font-bold mb-1">No Recent Activity</h3>
                                            <p className="text-gray-500 text-sm">System logs will appear here</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-8">
                            {/* System Status */}
                            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-6">System Status</h3>
                                <div className="space-y-6">
                                    {loading ? (
                                        [1, 2, 3].map((i) => (
                                            <div key={i} className="animate-pulse">
                                                <div className="flex justify-between mb-2">
                                                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2">
                                                    <div className="bg-gray-200 h-2 rounded-full w-1/2"></div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <>
                                            <div>
                                                <div className="flex justify-between text-sm font-medium mb-2">
                                                    <span className="text-gray-600">Server Load</span>
                                                    <span className="text-green-600">Healthy</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2">
                                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm font-medium mb-2">
                                                    <span className="text-gray-600">Database</span>
                                                    <span className="text-blue-600">Active</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2">
                                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm font-medium mb-2">
                                                    <span className="text-gray-600">Storage</span>
                                                    <span className="text-orange-600">{dashboardData?.systemStats?.storageUsed || '45%'}</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2">
                                                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="bg-indigo-900 text-white rounded-[2rem] p-8 shadow-xl shadow-indigo-900/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                                <h3 className="text-lg font-bold mb-6 relative z-10">Growth Overview</h3>
                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/10 rounded-xl">
                                            <LuTrendingUp className="w-6 h-6 text-green-400" />
                                        </div>
                                        <div>
                                            {loading ? (
                                                <div className="h-8 w-24 bg-white/20 animate-pulse rounded mb-1"></div>
                                            ) : (
                                                <div className="text-2xl font-black">{dashboardData?.stats?.users?.trend || '+5%'}</div>
                                            )}
                                            <div className="text-indigo-200 text-xs font-bold uppercase tracking-wide">New Users This Month</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
