'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardData } from '@/lib/types/dashboard';

import DashboardHero from '@/components/student/dashboard/DashboardHero';
import QuickAccessGrid from '@/components/student/dashboard/QuickAccessGrid';
import RecentActivityList from '@/components/student/dashboard/RecentActivityList';
import UpcomingAssignmentsList from '@/components/student/dashboard/UpcomingAssignmentsList';

interface ClientStudentDashboardProps {
    initialData: DashboardData | null;
}

export default function ClientStudentDashboard({ initialData }: ClientStudentDashboardProps) {
    const { user } = useAuth();

    // If initialData is null (fetch failure), we could show an error or try client-side fetch.
    // For now, let's just show a simple fallback or empty state, or handle it gracefully.
    // Ideally the page.tsx handles the null case or redirects.

    if (!initialData) {
        return (
            <div className="min-h-screen bg-gray-50/50 p-8 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900">Unable to load dashboard</h2>
                    <p className="text-gray-500 mb-4">Please try refreshing the page.</p>
                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const { overview: stats, recent_activity, upcoming_assignments } = initialData;

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            <DashboardHero user={user} stats={stats} />
            <QuickAccessGrid />

            {/* Recent Activity & Assignments */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-[fade-in_0.5s_ease-out]">
                <RecentActivityList activities={recent_activity} />
                <UpcomingAssignmentsList assignments={upcoming_assignments} />
            </div>
        </div>
    );
}
