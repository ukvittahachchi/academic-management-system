'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { teacherAPI } from '@/lib/api-client';
import { TeacherDashboardData, TeacherFilters, TeacherStudent } from '@/lib/types/teacher';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import TeacherStatCard from '@/components/teacher/StatCard';
import ClassCard from '@/components/teacher/ClassCard';
import StudentList from '@/components/teacher/StudentList';
import PerformanceChart from '@/components/teacher/PerformanceChart';
import DistributionChart from '@/components/teacher/DistributionChart';
import FilterPanel from '@/components/teacher/FilterPanel';
import { format } from 'date-fns';

export default function TeacherDashboard() {
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null);
    const [filters, setFilters] = useState<TeacherFilters | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<'overview' | 'classes' | 'students' | 'analytics'>('overview');
    const [selectedClass, setSelectedClass] = useState<number | null>(null);
    const [performanceFilters, setPerformanceFilters] = useState<Record<string, any>>({});
    const [students, setStudents] = useState<TeacherStudent[]>([]);

    useEffect(() => {
        loadDashboardData();
        loadFilters();
    }, []);

    useEffect(() => {
        if (selectedClass || performanceFilters.module_id || performanceFilters.class_section) {
            loadClassStudents();
        }
    }, [selectedClass, performanceFilters]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const data = await teacherAPI.getTeacherDashboard();
            setDashboardData(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load teacher dashboard');
        } finally {
            setLoading(false);
        }
    };

    const loadFilters = async () => {
        try {
            const filterData = await teacherAPI.getDashboardFilters();
            setFilters(filterData);
        } catch (err) {
            console.error('Failed to load filters:', err);
        }
    };

    const loadClassStudents = async () => {
        try {
            const studentData = await teacherAPI.getClassStudents(performanceFilters);
            setStudents(studentData.students);
        } catch (err) {
            console.error('Failed to load students:', err);
        }
    };

    const handleFilterChange = (newFilters: any) => {
        setPerformanceFilters(newFilters);
    };

    const handleStudentClick = (student: any) => {
        router.push(`/teacher/students/${student.student_id}`);
    };

    const handleClassClick = (classData: any) => {
        setSelectedClass(classData.assignment_id);
        setPerformanceFilters({
            module_id: classData.module_id,
            class_section: classData.class_section
        });
        setActiveView('students');
    };

    const getActivityTrendData = () => {
        if (!dashboardData) return [];

        return dashboardData.activity_trends.map(trend => ({
            date: format(new Date(trend.activity_date), 'yyyy-MM-dd'),
            active_students: trend.active_students,
            completed_items: trend.completed_items,
            avg_score: trend.avg_score
        }));
    };

    const getPerformanceTrendData = () => {
        if (!dashboardData) return [];

        return dashboardData.performance_trends.map(trend => ({
            date: format(new Date(trend.activity_date), 'yyyy-MM-dd'),
            active_students: trend.active_students,
            completed_items: trend.completed_items,
            avg_score: trend.avg_score
        }));
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

    if (!dashboardData || !filters) {
        return (
            <div className="p-8">
                <ErrorMessage error="No dashboard data available" onRetry={loadDashboardData} />
            </div>
        );
    }

    const { overview, classes, recent_activity, performance_distribution, top_performers, students_needing_attention } = dashboardData;

    return (
        <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
                                <p className="text-gray-600 mt-2">
                                    Monitor and guide your students' learning journey
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
                    {/* Navigation Tabs */}
                    <div className="mb-6">
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8">
                                <button
                                    onClick={() => setActiveView('overview')}
                                    className={`py-3 px-1 border-b-2 font-medium text-sm ${activeView === 'overview'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setActiveView('classes')}
                                    className={`py-3 px-1 border-b-2 font-medium text-sm ${activeView === 'classes'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    My Classes
                                </button>
                                <button
                                    onClick={() => setActiveView('students')}
                                    className={`py-3 px-1 border-b-2 font-medium text-sm ${activeView === 'students'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Students
                                </button>
                                <button
                                    onClick={() => setActiveView('analytics')}
                                    className={`py-3 px-1 border-b-2 font-medium text-sm ${activeView === 'analytics'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Analytics
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Overview View */}
                    {activeView === 'overview' && (
                        <div className="space-y-6">
                            {/* Stats Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <TeacherStatCard
                                    title="Total Classes"
                                    value={overview.total_classes}
                                    icon="🏫"
                                    color="blue"
                                    subtitle="Active classes assigned"
                                />

                                <TeacherStatCard
                                    title="Total Students"
                                    value={overview.total_students}
                                    icon="👨‍🎓"
                                    color="green"
                                    subtitle="Across all classes"
                                />

                                <TeacherStatCard
                                    title="Avg Class Score"
                                    value={overview.overall_avg_score.toFixed(1)}
                                    icon="📊"
                                    color="purple"
                                    trend={{ value: 5.2, isPositive: true }}
                                    subtitle="Overall average"
                                />

                                <TeacherStatCard
                                    title="Completion Rate"
                                    value={`${overview.avg_completion_rate.toFixed(1)}%`}
                                    icon="✅"
                                    color="teal"
                                    trend={{ value: 3.8, isPositive: true }}
                                    subtitle="Across all modules"
                                />
                            </div>

                            {/* Charts Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <PerformanceChart
                                    data={getActivityTrendData()}
                                    title="Class Activity Trends (Last 7 Days)"
                                    height={350}
                                />

                                <DistributionChart
                                    data={performance_distribution}
                                    title="Performance Distribution"
                                    height={350}
                                />
                            </div>

                            {/* Top Performers & Attention Needed */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Top Performers */}
                                <div className="bg-white rounded-xl shadow-sm border">
                                    <div className="p-6 border-b">
                                        <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
                                        <p className="text-sm text-gray-600 mt-1">Students with highest average scores</p>
                                    </div>
                                    <div className="divide-y divide-gray-200">
                                        {top_performers.map((student, index) => (
                                            <div key={student.student_id} className="p-4 hover:bg-gray-50">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-full flex items-center justify-center">
                                                            <span className="text-yellow-600 font-bold">
                                                                {index + 1}
                                                            </span>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {student.full_name}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {student.class_grade} • {student.module_name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-green-600">
                                                            {student.avg_score.toFixed(1)}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            Avg Score
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 border-t">
                                        <button
                                            onClick={() => setActiveView('students')}
                                            className="w-full py-2 text-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            View All Top Performers →
                                        </button>
                                    </div>
                                </div>

                                {/* Students Needing Attention */}
                                <div className="bg-white rounded-xl shadow-sm border">
                                    <div className="p-6 border-b">
                                        <h3 className="text-lg font-semibold text-gray-900">Need Attention</h3>
                                        <p className="text-sm text-gray-600 mt-1">Students requiring extra support</p>
                                    </div>
                                    <div className="divide-y divide-gray-200">
                                        {students_needing_attention.map((student) => (
                                            <div key={student.student_id} className="p-4 hover:bg-gray-50">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-red-100 to-red-200 rounded-full flex items-center justify-center">
                                                            <span className="text-red-600 font-bold">!</span>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {student.full_name}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                Inactive for {student.days_inactive} days
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-red-600">
                                                            {student.avg_score?.toFixed(1) || 'N/A'}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            Avg Score
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 border-t">
                                        <button
                                            onClick={() => setActiveView('students')}
                                            className="w-full py-2 text-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            View All Students Needing Attention →
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-white rounded-xl shadow-sm border">
                                <div className="p-6 border-b">
                                    <h3 className="text-lg font-semibold text-gray-900">Recent Class Activity</h3>
                                    <p className="text-sm text-gray-600 mt-1">Latest student submissions and completions</p>
                                </div>
                                <div className="divide-y divide-gray-200">
                                    {recent_activity.slice(0, 5).map((activity, index) => (
                                        <div key={index} className="p-4 hover:bg-gray-50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <span className="text-blue-600">
                                                            {activity.score ? '📝' : '📚'}
                                                        </span>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {activity.student_name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            Completed {activity.content_title} in {activity.module_name}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {activity.score ? `${activity.score} points` : 'Completed'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {format(new Date(activity.completed_at), 'MMM dd, hh:mm a')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Classes View */}
                    {activeView === 'classes' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-900">My Classes</h2>
                                <span className="text-sm text-gray-500">
                                    {classes.length} classes total
                                </span>
                            </div>

                            {classes.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                                    <div className="text-gray-400 text-4xl mb-3">🏫</div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Assigned</h3>
                                    <p className="text-gray-500">
                                        You haven't been assigned to any classes yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {classes.map((classData) => (
                                        <ClassCard
                                            key={classData.assignment_id}
                                            classData={classData}
                                            onClick={() => handleClassClick(classData)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Students View */}
                    {activeView === 'students' && (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Filter Panel */}
                            <div className="lg:col-span-1">
                                <FilterPanel
                                    filters={performanceFilters}
                                    availableModules={filters.modules}
                                    availableSections={filters.class_sections}
                                    onFilterChange={handleFilterChange}
                                    onReset={() => {
                                        setSelectedClass(null);
                                        setPerformanceFilters({});
                                    }}
                                />
                            </div>

                            {/* Student List */}
                            <div className="lg:col-span-3">
                                <StudentList
                                    students={students}
                                    onStudentClick={handleStudentClick}
                                    showFilters={false}
                                />
                            </div>
                        </div>
                    )}

                    {/* Analytics View */}
                    {activeView === 'analytics' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2">
                                    <PerformanceChart
                                        data={getPerformanceTrendData()}
                                        type="line"
                                        title="Performance Trends (Last 7 Days)"
                                        height={400}
                                    />
                                </div>

                                <div>
                                    <DistributionChart
                                        data={performance_distribution}
                                        title="Student Score Distribution"
                                        height={400}
                                    />
                                </div>
                            </div>

                            {/* Class Comparison */}
                            <div className="bg-white rounded-xl shadow-sm border">
                                <div className="p-6 border-b">
                                    <h3 className="text-lg font-semibold text-gray-900">Class Performance Comparison</h3>
                                </div>
                                <div className="p-6">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Class
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Students
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Avg Score
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Completion Rate
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Avg Study Time
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Last Activity
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {dashboardData.classes.map((classItem) => (
                                                    <tr key={classItem.assignment_id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-gray-900">
                                                                {classItem.module_name}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                Section {classItem.class_section}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">
                                                            {classItem.student_count}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${classItem.class_avg_score >= 80 ? 'bg-green-100 text-green-800' :
                                                                classItem.class_avg_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-red-100 text-red-800'
                                                                }`}>
                                                                {classItem.class_avg_score.toFixed(1)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="w-32">
                                                                <div className="flex justify-between text-sm mb-1">
                                                                    <span>{classItem.completion_rate.toFixed(1)}%</span>
                                                                </div>
                                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                                    <div
                                                                        className="h-2 rounded-full bg-blue-600"
                                                                        style={{ width: `${classItem.completion_rate}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">
                                                            45 min
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            {classItem.last_activity
                                                                ? format(new Date(classItem.last_activity), 'MMM dd')
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
                            onClick={() => router.push('/teacher/assignments')}
                            className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-center"
                        >
                            <div className="text-2xl mb-2">📝</div>
                            <div className="font-medium text-gray-900">Manage Assignments</div>
                        </button>

                        <button
                            onClick={() => {
                                // Export reports
                            }}
                            className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-center"
                        >
                            <div className="text-2xl mb-2">📊</div>
                            <div className="font-medium text-gray-900">Export Reports</div>
                        </button>

                        <button
                            onClick={() => {
                                // Send announcements
                            }}
                            className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-center"
                        >
                            <div className="text-2xl mb-2">📢</div>
                            <div className="font-medium text-gray-900">Send Announcement</div>
                        </button>

                        <button
                            onClick={() => window.print()}
                            className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-center"
                        >
                            <div className="text-2xl mb-2">🖨️</div>
                            <div className="font-medium text-gray-900">Print Dashboard</div>
                        </button>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}