'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import StudentButton from '@/components/ui/StudentButton';
import {
    LuBookOpen,
    LuTrophy,
    LuClock,
    LuCalendar,
    LuArrowRight,
    LuPlay,
    LuActivity,
    LuUser
} from 'react-icons/lu';
import { format } from 'date-fns';

export default function ClientStudentDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                setLoading(true);
                const response = await apiClient.getStudentDashboard();
                setDashboardData(response);
            } catch (err: any) {
                setError(err.message || 'Failed to load dashboard');
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50/50">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50/50 p-8">
                <ErrorMessage error={error} onRetry={() => window.location.reload()} />
            </div>
        );
    }

    const { overview: stats, recent_activity, upcoming_assignments } = dashboardData;

    return (
        <ProtectedRoute requiredRole="student">
            <div className="min-h-screen bg-gray-50/50 pb-20">
                {/* Premium Hero Section */}
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-brand-500 pb-32 relative overflow-hidden shadow-2xl shadow-indigo-500/20 isolate text-white rounded-b-[3rem]">
                    {/* Abstract Shapes */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-brand-400/20 rounded-full blur-2xl opacity-50 pointer-events-none"></div>

                    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-black text-white flex items-center gap-4 mb-3 tracking-tight">
                                    Hello, {user?.username || 'Student'}! <span className="animate-pulse">👋</span>
                                </h1>
                                <p className="text-indigo-100 text-lg font-medium max-w-xl leading-relaxed">
                                    Ready to continue your learning journey? You're doing great!
                                </p>
                            </div>

                            {/* Stats Cards in Hero */}
                            <div className="flex gap-4">
                                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl font-black text-white border border-white/10 shadow-lg flex flex-col items-center min-w-[120px]">
                                    <div className="text-3xl flex items-center gap-2">
                                        <LuTrophy className="text-yellow-300" /> {stats?.completed_parts || 0}
                                    </div>
                                    <span className="text-xs uppercase tracking-widest text-indigo-200">Lessons Done</span>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl font-black text-white border border-white/10 shadow-lg flex flex-col items-center min-w-[120px]">
                                    <div className="text-3xl flex items-center gap-2">
                                        <LuClock className="text-green-300" /> {Math.round((stats?.total_study_time_minutes || 0) / 60)}h
                                    </div>
                                    <span className="text-xs uppercase tracking-widest text-indigo-200">Learning Time</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Access Grid */}
                <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-20 relative z-20 mb-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        <button onClick={() => router.push('/student/modules')} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-indigo-500/10 border border-white/50 hover:-translate-y-1 hover:shadow-2xl transition-all group text-left">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                <LuBookOpen className="w-7 h-7" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg">My Modules</h3>
                            <p className="text-gray-500 text-sm font-medium mt-1">Access your courses</p>
                        </button>

                        <button onClick={() => router.push('/student/assignments')} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-indigo-500/10 border border-white/50 hover:-translate-y-1 hover:shadow-2xl transition-all group text-left">
                            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                                <LuActivity className="w-7 h-7" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg">Assignments</h3>
                            <p className="text-gray-500 text-sm font-medium mt-1">Check pending tasks</p>
                        </button>

                        <button onClick={() => router.push('/student/profile')} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-indigo-500/10 border border-white/50 hover:-translate-y-1 hover:shadow-2xl transition-all group text-left">
                            <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-600 mb-4 group-hover:scale-110 transition-transform">
                                <LuUser className="w-7 h-7" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg">My Profile</h3>
                            <p className="text-gray-500 text-sm font-medium mt-1">View stats & settings</p>
                        </button>

                        <button onClick={() => router.push('/student/downloads')} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-indigo-500/10 border border-white/50 hover:-translate-y-1 hover:shadow-2xl transition-all group text-left">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                <LuActivity className="w-7 h-7" /> {/* Using Activity as generic icon or could be Download */}
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg">Downloads</h3>
                            <p className="text-gray-500 text-sm font-medium mt-1">Offline materials</p>
                        </button>
                    </div>
                </div>

                {/* Recent Activity & Assignments */}
                <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-[fade-in_0.5s_ease-out]">
                    {/* Recent Activity */}
                    <div className="bg-white rounded-[2rem] p-8 shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-gray-900">Recent Activity</h2>
                            <StudentButton variant="ghost" size="sm" onClick={() => router.push('/student/modules')}>View All</StudentButton>
                        </div>

                        <div className="space-y-4">
                            {recent_activity && recent_activity.length > 0 ? (
                                recent_activity.map((activity: any, index: number) => (
                                    <div key={index} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                        <div className={`p-3 rounded-xl bg-indigo-100 text-indigo-600`}>
                                            <LuPlay />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">{activity.content_title}</h4>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">{activity.module_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-gray-400 block">
                                                {activity.completed_at ? format(new Date(activity.completed_at), 'MMM d') : '-'}
                                            </span>
                                            {activity.score !== null && <span className="text-sm font-black text-green-500">{activity.score}%</span>}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-gray-400">
                                    <p>No recent activity yet. Start a lesson!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Assignments */}
                    <div className="bg-white rounded-[2rem] p-8 shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-gray-900">Up Next</h2>
                            <StudentButton variant="ghost" size="sm" onClick={() => router.push('/student/assignments')}>View All</StudentButton>
                        </div>

                        <div className="space-y-4">
                            {upcoming_assignments && upcoming_assignments.length > 0 ? (
                                upcoming_assignments.map((assignment: any) => (
                                    <div key={assignment.assignment_id} className="flex items-center gap-4 p-4 rounded-2xl bg-orange-50/50 border border-orange-100">
                                        <div className="p-3 rounded-xl bg-white text-orange-500 shadow-sm">
                                            <LuCalendar />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">{assignment.title}</h4>
                                            <p className="text-xs text-orange-600 font-bold flex items-center gap-1">
                                                <LuClock className="w-3 h-3" /> Due {assignment.end_date ? format(new Date(assignment.end_date), 'MMM d, h:mm a') : 'No Due Date'}
                                            </p>
                                        </div>
                                        <StudentButton size="sm" onClick={() => router.push(`/student/modules/learn/${assignment.part_id}`)}>
                                            Start
                                        </StudentButton>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-gray-400">
                                    <p>No upcoming assignments!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
