'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { analyticsAPI } from '@/lib/api-client';
import { StudentAnalytics, ImprovementRecommendation } from '@/lib/types/analytics';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import ProgressTimeline from '@/components/analytics/ProgressTimeline';
import AssignmentAnalysis from '@/components/analytics/AssignmentAnalysis';
import TimeAnalysis from '@/components/analytics/TimeAnalysis';
import WeakAreas from '@/components/analytics/WeakAreas';
import Recommendations from '@/components/analytics/Recommendations';
import { format } from 'date-fns';

export default function StudentAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = parseInt(params.studentId as string);
    const moduleId = searchParams.get('module_id') ? parseInt(searchParams.get('module_id')!) : undefined;

    const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
    const [recommendations, setRecommendations] = useState<ImprovementRecommendation[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'assignments' | 'time' | 'weakareas' | 'recommendations'>('overview');
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');

    useEffect(() => {
        loadAnalytics();
        loadRecommendations();
    }, [studentId, moduleId]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const data = await analyticsAPI.getStudentAnalytics(studentId, moduleId);
            setAnalytics(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load student analytics');
        } finally {
            setLoading(false);
        }
    };

    const loadRecommendations = async () => {
        try {
            const data = await analyticsAPI.getImprovementRecommendations(studentId);
            setRecommendations(data);
        } catch (err) {
            console.error('Failed to load recommendations:', err);
        }
    };

    const handleUpdateWeakArea = async (weakAreaId: number, status: string, notes: string) => {
        try {
            await analyticsAPI.updateWeakAreaStatus(weakAreaId, status, notes);
            // Reload analytics to reflect changes
            loadAnalytics();
        } catch (err) {
            console.error('Failed to update weak area:', err);
            alert('Failed to update weak area status');
        }
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
                <ErrorMessage error={error} onRetry={loadAnalytics} />
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="p-8">
                <ErrorMessage error="No analytics data available" onRetry={loadAnalytics} />
            </div>
        );
    }

    const { overall_summary, weekly_trends, assignment_performance, time_spent_analysis, weak_areas, content_type_performance } = analytics;
    const studentName = overall_summary.full_name;

    return (
        <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="flex items-center space-x-4">
                                    <button
                                        onClick={() => router.back()}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        ← Back
                                    </button>
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900">
                                            {studentName}'s Analytics
                                        </h1>
                                        <p className="text-gray-600 mt-1">
                                            {overall_summary.class_grade} • Roll: {overall_summary.roll_number}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-500">
                                    Updated: {format(new Date(), 'hh:mm a')}
                                </span>
                                <button
                                    onClick={loadAnalytics}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Overview Stats */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="text-2xl font-bold text-blue-600">
                                {overall_summary.completion_percentage.toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">Completion Rate</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="text-2xl font-bold text-green-600">
                                {overall_summary.avg_score.toFixed(1)}
                            </div>
                            <div className="text-sm text-gray-600">Average Score</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="text-2xl font-bold text-purple-600">
                                {Math.round(overall_summary.total_study_minutes)} min
                            </div>
                            <div className="text-sm text-gray-600">Total Study Time</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="text-2xl font-bold text-orange-600">
                                {overall_summary.active_days}
                            </div>
                            <div className="text-sm text-gray-600">Active Days</div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="mb-6">
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8 overflow-x-auto">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'overview'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('progress')}
                                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'progress'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Progress Timeline
                                </button>
                                <button
                                    onClick={() => setActiveTab('assignments')}
                                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'assignments'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Assignments
                                </button>
                                <button
                                    onClick={() => setActiveTab('time')}
                                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'time'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Time Analysis
                                </button>
                                <button
                                    onClick={() => setActiveTab('weakareas')}
                                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'weakareas'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Weak Areas
                                </button>
                                <button
                                    onClick={() => setActiveTab('recommendations')}
                                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'recommendations'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Recommendations
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Content based on active tab */}
                    <div className="space-y-6">
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Trends</h3>
                                        <div className="space-y-3">
                                            {weekly_trends.slice(-4).reverse().map((week, index) => (
                                                <div key={index} className="p-3 border border-gray-200 rounded-lg">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-medium">
                                                            Week of {format(new Date(week.week_start), 'MMM dd')}
                                                        </span>
                                                        <span className="text-sm text-gray-500">
                                                            {week.active_days} active days
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                                        <div className="text-center">
                                                            <div className="font-bold">{week.weekly_completed}</div>
                                                            <div className="text-gray-500">Completed</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="font-bold">{week.weekly_avg_score.toFixed(1)}</div>
                                                            <div className="text-gray-500">Avg Score</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="font-bold">{Math.round(week.weekly_study_minutes)}m</div>
                                                            <div className="text-gray-500">Study Time</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Performance</h3>
                                        <div className="space-y-3">
                                            {content_type_performance.map((content, index) => (
                                                <div key={index} className="p-3 border border-gray-200 rounded-lg">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-medium capitalize">{content.part_type}</span>
                                                        <span className="text-sm text-gray-500">
                                                            {content.completed_count} completed
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="text-sm text-gray-600">Average Score</div>
                                                            <div className={`text-lg font-bold ${content.avg_score >= 80 ? 'text-green-600' :
                                                                content.avg_score >= 60 ? 'text-yellow-600' :
                                                                    'text-red-600'
                                                                }`}>
                                                                {content.avg_score.toFixed(1)}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-gray-600">Avg Time</div>
                                                            <div className="text-lg font-bold">
                                                                {Math.round(content.avg_time_minutes)}m
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <WeakAreas
                                    weakAreas={weak_areas.slice(0, 3)}
                                    studentName={studentName}
                                    isTeacher={true}
                                    onStatusUpdate={handleUpdateWeakArea}
                                />
                            </div>
                        )}

                        {activeTab === 'progress' && (
                            <ProgressTimeline
                                progressItems={analytics.weekly_trends.flatMap(week => ({
                                    content_title: `Week of ${format(new Date(week.week_start), 'MMM dd')}`,
                                    part_type: 'weekly_summary',
                                    module_name: 'All Modules',
                                    status: 'completed',
                                    score: week.weekly_avg_score,
                                    completed_at: week.week_start,
                                    time_spent_seconds: week.weekly_study_minutes * 60,
                                    duration_minutes: week.weekly_study_minutes,
                                    days_to_complete: 7,
                                    score_category: week.weekly_avg_score >= 80 ? 'excellent' :
                                        week.weekly_avg_score >= 60 ? 'good' :
                                            week.weekly_avg_score >= 40 ? 'average' : 'needs_improvement'
                                }))}
                                studentName={studentName}
                            />
                        )}

                        {activeTab === 'assignments' && (
                            <AssignmentAnalysis
                                assignments={assignment_performance}
                                studentName={studentName}
                            />
                        )}

                        {activeTab === 'time' && (
                            <TimeAnalysis
                                timeData={time_spent_analysis}
                                studentName={studentName}
                            />
                        )}

                        {activeTab === 'weakareas' && (
                            <WeakAreas
                                weakAreas={weak_areas}
                                studentName={studentName}
                                isTeacher={true}
                                onStatusUpdate={handleUpdateWeakArea}
                            />
                        )}

                        {activeTab === 'recommendations' && (
                            <Recommendations
                                recommendations={recommendations}
                                studentName={studentName}
                            />
                        )}
                    </div>

                    {/* Export Options */}
                    <div className="mt-8 pt-6 border-t">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Analytics</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
                                <div className="text-2xl mb-2">📄</div>
                                <div className="font-medium text-gray-900">PDF Report</div>
                            </button>
                            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
                                <div className="text-2xl mb-2">📊</div>
                                <div className="font-medium text-gray-900">Excel Data</div>
                            </button>
                            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
                                <div className="text-2xl mb-2">📈</div>
                                <div className="font-medium text-gray-900">Charts</div>
                            </button>
                            <button className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
                                <div className="text-2xl mb-2">📋</div>
                                <div className="font-medium text-gray-900">Summary</div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}