'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient as dashboardAPI } from '@/lib/api-client';
import { DashboardData } from '@/lib/types/dashboard';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import StatCard from '@/components/dashboard/StatCard';
import ProgressChart from '@/components/dashboard/ProgressChart';
import LineChart from '@/components/dashboard/LineChart';
import BarChart from '@/components/dashboard/BarChart';
import ActivityStreak from '@/components/dashboard/ActivityStreak';
import UpcomingAssignments from '@/components/dashboard/UpcomingAssignments';
import RecentActivity from '@/components/dashboard/RecentActivity';
import Notifications from '@/components/dashboard/Notifications';
import { format } from 'date-fns';

export default function StudentDashboard() {
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'grades'>('overview');
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

    useEffect(() => {
        loadDashboardData();

        // Refresh data every 5 minutes
        const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const data = await dashboardAPI.getDashboardData();
            setDashboardData(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const getPerformanceChartData = () => {
        if (!dashboardData) return [];

        return dashboardData.performance_history.map(item => ({
            date: format(new Date(item.date), 'MMM dd'),
            'Completed Items': item.daily_completed,
            'Average Score': item.daily_avg_score || 0,
            'Study Time (min)': item.daily_study_time || 0
        }));
    };

    const getModuleProgressData = () => {
        if (!dashboardData) return [];

        return dashboardData.module_progress.map(module => ({
            name: module.module_name,
            value: module.completed_parts,
            color: module.progress_percentage >= 80 ? '#10B981' :
                module.progress_percentage >= 50 ? '#3B82F6' :
                    module.progress_percentage >= 30 ? '#F59E0B' :
                        '#EF4444'
        }));
    };

    const getGradesChartData = () => {
        if (!dashboardData) return [];

        return dashboardData.grades_overview.map(grade => ({
            date: grade.module_name,
            'Average Grade': grade.avg_percentage || 0,
            'Highest Grade': grade.highest_percentage || 0,
            'Lowest Grade': grade.lowest_percentage || 0
        }));
    };

    const getStudyTimeData = () => {
        if (!dashboardData) return [];

        return dashboardData.study_time_stats.map(day => ({
            name: format(new Date(day.study_date), 'EEE'),
            value: day.total_minutes || 0,
            completed: day.completed_items || 0
        }));
    };

    const getActivityStreakData = () => {
        if (!dashboardData) return { streak: 0, recentActivity: [] };

        const recentActivity = dashboardData.performance_history.map(item => ({
            date: item.date,
            completed: item.daily_completed
        }));

        return {
            streak: dashboardData.overview.activity_streak,
            recentActivity
        };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <ErrorMessage error={error} onRetry={loadDashboardData} />
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="p-8">
                <ErrorMessage error="No dashboard data available" onRetry={loadDashboardData} />
            </div>
        );
    }

    const { overview, upcoming_assignments, recent_activity, notifications } = dashboardData;

    if (!overview) {
        return (
            <div className="p-8">
                <ErrorMessage error="Dashboard overview data is missing" onRetry={loadDashboardData} />
            </div>
        );
    }

    return (
        <ProtectedRoute requiredRole="student">
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
                                <p className="text-gray-600 mt-2">
                                    Welcome back! Here's your learning progress summary
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-500">
                                    Last updated: {format(new Date(), 'hh:mm a')}
                                </span>
                                <button
                                    onClick={loadDashboardData}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <StatCard
                            title="Completion Rate"
                            value={`${(overview.completion_percentage || 0).toFixed(1)}%`}
                            change="+5.2%"
                            icon="📈"
                            color="green"
                            description={`${overview.completed_parts} of ${overview.total_learning_parts || 0} items`}
                        />

                        <StatCard
                            title="Average Score"
                            value={(overview.avg_score || 0).toFixed(1)}
                            change="+2.1"
                            icon="🎯"
                            color="blue"
                            description="Across all completed items"
                        />

                        <StatCard
                            title="Activity Streak"
                            value={`${overview.activity_streak} days`}
                            icon="🔥"
                            color="orange"
                            description="Keep going for your next milestone!"
                        />

                        <StatCard
                            title="Study Time"
                            value={`${Math.round(overview.total_study_time_minutes || 0)} min`}
                            icon="⏱️"
                            color="purple"
                            description={`${Math.round(overview.avg_daily_study_minutes || 0)} min/day average`}
                        />
                    </div>

                    {/* Tabs */}
                    <div className="mb-6">
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('progress')}
                                    className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'progress'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Progress
                                </button>
                                <button
                                    onClick={() => setActiveTab('grades')}
                                    className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'grades'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Grades
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Content based on active tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* First Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2">
                                    <LineChart
                                        data={getPerformanceChartData()}
                                        lines={[
                                            { key: 'Completed Items', name: 'Completed Items', color: '#10B981' },
                                            { key: 'Average Score', name: 'Average Score', color: '#3B82F6' },
                                            { key: 'Study Time (min)', name: 'Study Time (min)', color: '#8B5CF6' }
                                        ]}
                                        title="Daily Performance (Last 7 Days)"
                                        height={300}
                                    />
                                </div>

                                <div>
                                    <ProgressChart
                                        data={getModuleProgressData()}
                                        title="Module Progress"
                                        total={overview.total_learning_parts}
                                        completed={overview.completed_parts}
                                    />
                                </div>
                            </div>

                            {/* Second Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div>
                                    <UpcomingAssignments
                                        assignments={upcoming_assignments}
                                        limit={3}
                                    />
                                </div>

                                <div>
                                    <ActivityStreak {...getActivityStreakData()} />
                                </div>

                                <div>
                                    <Notifications notifications={notifications} />
                                </div>
                            </div>

                            {/* Third Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <RecentActivity
                                    activities={recent_activity}
                                    limit={4}
                                />

                                <div>
                                    <BarChart
                                        data={getStudyTimeData()}
                                        title="Weekly Study Time (Minutes)"
                                        height={250}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'progress' && (
                        <div className="space-y-6">
                            {/* Time Range Selector */}
                            <div className="flex justify-end">
                                <div className="inline-flex rounded-lg border border-gray-200 p-1">
                                    {['week', 'month', 'year'].map((range) => (
                                        <button
                                            key={range}
                                            onClick={() => setTimeRange(range as any)}
                                            className={`px-4 py-2 text-sm font-medium rounded-md ${timeRange === range
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-700 hover:text-gray-900'
                                                }`}
                                        >
                                            {range.charAt(0).toUpperCase() + range.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Progress Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <LineChart
                                    data={getPerformanceChartData()}
                                    lines={[
                                        { key: 'Completed Items', name: 'Completed Items', color: '#10B981' },
                                        { key: 'Study Time (min)', name: 'Study Time (min)', color: '#8B5CF6' }
                                    ]}
                                    title="Learning Activity"
                                    height={350}
                                />

                                <BarChart
                                    data={dashboardData.module_progress.map(m => ({
                                        name: m.module_name,
                                        value: m.progress_percentage,
                                        color: m.progress_percentage >= 80 ? '#10B981' :
                                            m.progress_percentage >= 50 ? '#3B82F6' :
                                                m.progress_percentage >= 30 ? '#F59E0B' :
                                                    '#EF4444'
                                    }))}
                                    title="Module Completion Percentage"
                                    height={350}
                                    showAxis={true}
                                />
                            </div>

                            {/* Detailed Module Progress */}
                            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        Module Progress Details
                                    </h3>

                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead>
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Module
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Progress
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Completed
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Avg Score
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {dashboardData.module_progress.map((module, index) => (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="px-4 py-4">
                                                            <div>
                                                                <div className="font-medium text-gray-900">
                                                                    {module.module_name}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    {module.total_parts} learning items
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="w-48">
                                                                <div className="flex justify-between text-sm mb-1">
                                                                    <span>{module.progress_percentage}%</span>
                                                                    <span>{module.completed_parts}/{module.total_parts}</span>
                                                                </div>
                                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                                    <div
                                                                        className="h-2 rounded-full bg-blue-600"
                                                                        style={{ width: `${module.progress_percentage}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm">
                                                            {module.completed_parts} items
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${(module.avg_score || 0) >= 80 ? 'bg-green-100 text-green-800' :
                                                                (module.avg_score || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-red-100 text-red-800'
                                                                }`}>
                                                                {module.avg_score?.toFixed(1) || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            {module.progress_percentage >= 100 ? (
                                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                                                    ✓ Completed
                                                                </span>
                                                            ) : module.progress_percentage >= 50 ? (
                                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                                                    In Progress
                                                                </span>
                                                            ) : module.progress_percentage > 0 ? (
                                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                                                    Started
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                                                    Not Started
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'grades' && (
                        <div className="space-y-6">
                            {/* Grades Summary */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <LineChart
                                        data={getGradesChartData()}
                                        lines={[
                                            { key: 'Average Grade', name: 'Average Grade', color: '#3B82F6' },
                                            { key: 'Highest Grade', name: 'Highest Grade', color: '#10B981' },
                                            { key: 'Lowest Grade', name: 'Lowest Grade', color: '#EF4444' }
                                        ]}
                                        title="Module Grades Distribution"
                                        height={350}
                                    />
                                </div>

                                <div className="bg-white p-6 rounded-xl shadow-sm border">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Grades Overview</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600">Total Assignments</span>
                                            <span className="font-medium">{overview.total_assignments || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600">Passed Assignments</span>
                                            <span className="font-medium text-green-600">
                                                {overview.passed_assignments}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600">Overall Pass Rate</span>
                                            <span className="font-medium">
                                                {(overview.total_assignments || 0) > 0
                                                    ? `${((overview.passed_assignments / (overview.total_assignments || 1)) * 100).toFixed(1)}%`
                                                    : 'N/A'
                                                }
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600">Average Grade</span>
                                            <span className="font-medium">{(overview.avg_score || 0).toFixed(1)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Assignment Performance Table */}
                            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        Assignment Performance
                                    </h3>

                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead>
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Assignment
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Module
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Best Score
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Attempts
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Last Attempt
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {dashboardData.assignment_performance.map((assignment, index) => (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="px-4 py-4">
                                                            <div className="font-medium text-gray-900">
                                                                {assignment.title}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {assignment.total_marks} marks
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm">
                                                            {assignment.module_name}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center">
                                                                <span className="font-medium">
                                                                    {assignment.best_score || 0}/{assignment.total_marks}
                                                                </span>
                                                                <span className="ml-2 text-sm text-gray-500">
                                                                    ({assignment.best_percentage || 0}%)
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${assignment.attempts_used >= assignment.max_attempts
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                {assignment.attempts_used}/{assignment.max_attempts}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            {assignment.passed ? (
                                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                                                    ✓ Passed
                                                                </span>
                                                            ) : assignment.attempts_used > 0 ? (
                                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                                                    ✗ Failed
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                                                    Not Attempted
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-sm text-gray-500">
                                                            {assignment.last_attempt_at
                                                                ? format(new Date(assignment.last_attempt_at), 'MMM dd, yyyy')
                                                                : 'Never'
                                                            }
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button
                            onClick={() => router.push('/student/modules')}
                            className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-center"
                        >
                            <div className="text-2xl mb-2">📚</div>
                            <div className="font-medium text-gray-900">Continue Learning</div>
                        </button>

                        <button
                            onClick={() => router.push('/student/assignments')}
                            className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-center"
                        >
                            <div className="text-2xl mb-2">📝</div>
                            <div className="font-medium text-gray-900">View Assignments</div>
                        </button>

                        <button
                            onClick={() => router.push('/student/downloads')}
                            className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-center"
                        >
                            <div className="text-2xl mb-2">📥</div>
                            <div className="font-medium text-gray-900">Downloads</div>
                        </button>

                        <button
                            onClick={() => {
                                // Print or export progress
                                window.print();
                            }}
                            className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-center"
                        >
                            <div className="text-2xl mb-2">🖨️</div>
                            <div className="font-medium text-gray-900">Print Progress</div>
                        </button>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}