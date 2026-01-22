'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { teacherAPI } from '@/lib/api-client';
import { TeacherDashboardData, TeacherFilters, TeacherStudent } from '@/lib/types/teacher';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import TeacherHero from '@/components/teacher/TeacherHero';
import QuickActionCard from '@/components/teacher/QuickActionCard';
import ClassCard from '@/components/teacher/ClassCard';
import StudentList from '@/components/teacher/StudentList';
import PerformanceChart from '@/components/teacher/PerformanceChart';
import DistributionChart from '@/components/teacher/DistributionChart';
import FilterPanel from '@/components/teacher/FilterPanel';
import Notifications from '@/components/dashboard/Notifications'; // Reusing Student Notifications
import { format } from 'date-fns';
import {
    LuFileText,
    LuUsers,
    LuBookOpen
} from 'react-icons/lu';
import { BarChart3 } from 'lucide-react';

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
        if (activeView === 'students') {
            loadClassStudents();
        }
    }, [activeView, performanceFilters]);

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
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <ErrorMessage error={error} onRetry={loadDashboardData} />
            </div>
        );
    }

    if (!dashboardData || !filters) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <ErrorMessage error="No dashboard data available" onRetry={loadDashboardData} />
            </div>
        );
    }

    const { overview, classes, recent_activity, performance_distribution, top_performers, students_needing_attention, recent_reports, notifications } = dashboardData;

    return (
        <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <div className="min-h-screen bg-gray-50/50 pb-20">
                {/* Hero Section */}
                <TeacherHero
                    stats={{
                        totalStudents: overview.total_students,
                        totalClasses: overview.total_classes,
                        avgPerformance: overview.overall_avg_score
                    }}
                />

                {/* Main Content Container - Pulling up over Hero */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20">

                    {/* Quick Access Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
                        <QuickActionCard
                            title="Export Reports"
                            description="Download Data"
                            icon={LuFileText}
                            color="green"
                            onClick={() => router.push('/teacher/reports')}
                        />
                        <QuickActionCard
                            title="Student Directory"
                            description="View All Students"
                            icon={LuUsers}
                            color="blue"
                            onClick={() => setActiveView('students')}
                        />
                        <QuickActionCard
                            title="My Classes"
                            description="Manage Courses"
                            icon={LuBookOpen}
                            color="purple"
                            onClick={() => setActiveView('classes')}
                        />
                        <QuickActionCard
                            title="Analytics"
                            description="Performance Stats"
                            icon={BarChart3}
                            color="orange"
                            onClick={() => setActiveView('analytics')}
                        />
                    </div>

                    {/* Dashboard Views */}
                    <div className="space-y-6">
                        {activeView === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 animate-[fade-in_0.5s_ease-out]">
                                {/* Main Column (2/3 width) */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Activity Chart */}
                                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                                        <PerformanceChart
                                            data={getActivityTrendData()}
                                            title="Class Activity Trends (Last 7 Days)"
                                            height={300}
                                        />
                                    </div>

                                    {/* Recent Activity List */}
                                    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                            <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                                            <button onClick={() => setActiveView('students')} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">View All</button>
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                            {recent_activity.slice(0, 5).map((activity, index) => (
                                                <div
                                                    key={index}
                                                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                                    onClick={() => handleStudentClick({ student_id: activity.student_id })}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activity.score ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                {activity.score ? '📝' : '📚'}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-bold text-gray-900">
                                                                    {activity.student_name}
                                                                </div>
                                                                <div className="text-xs text-gray-500 font-medium">
                                                                    Completed {activity.content_title} • {activity.module_name}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            {activity.score && (
                                                                <div className="text-sm font-bold text-green-600">
                                                                    {activity.score} pts
                                                                </div>
                                                            )}
                                                            <div className="text-xs text-gray-400">
                                                                {format(new Date(activity.completed_at), 'MMM dd')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Side Column (1/3 width) */}
                                <div className="space-y-6">
                                    {/* Notifications */}
                                    <Notifications notifications={notifications as any[]} />

                                    {/* Needs Attention Card */}
                                    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="p-6 border-b border-gray-100 bg-red-50/50">
                                            <h3 className="text-lg font-bold text-red-900">Needs Attention</h3>
                                            <p className="text-xs text-red-700 font-medium mt-1">Students requiring support</p>
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                            {students_needing_attention.length > 0 ? (
                                                students_needing_attention.map((student) => (
                                                    <div
                                                        key={student.student_id}
                                                        className="p-4 hover:bg-gray-50 cursor-pointer"
                                                        onClick={() => handleStudentClick(student)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                                                                    !
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-bold text-gray-900">{student.full_name}</div>
                                                                    <div className="text-xs text-gray-500">{student.days_inactive} days inactive</div>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                                                {student.avg_score ? Number(student.avg_score).toFixed(0) : 0}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-6 text-center text-gray-500 text-sm">Great job! Everyone is on track.</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Score Distribution Mini Chart */}
                                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-900 mb-4">Score Distribution</h3>
                                        <div className="h-48">
                                            <DistributionChart
                                                data={performance_distribution}
                                                title=""
                                                height={192}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeView === 'classes' && (
                            <div className="animate-[fade-in_0.3s_ease-out]">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900">Your Classes</h2>
                                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
                                        {classes.length} Total
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {classes.map((classData) => (
                                        <ClassCard
                                            key={classData.assignment_id}
                                            classData={classData}
                                            onClick={() => handleClassClick(classData)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeView === 'students' && (
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-[fade-in_0.3s_ease-out]">
                                <div className="lg:col-span-1">
                                    <div className="sticky top-6">
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
                                </div>
                                <div className="lg:col-span-3">
                                    <StudentList
                                        students={students}
                                        onStudentClick={handleStudentClick}
                                        showFilters={false}
                                    />
                                </div>
                            </div>
                        )}

                        {activeView === 'analytics' && (
                            <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
                                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                                    <PerformanceChart
                                        data={getPerformanceTrendData()}
                                        type="line"
                                        title="Overall Performance Trends"
                                        height={400}
                                    />
                                </div>
                                {/* Original Table Code for Analytics Table maintained for functionality */}
                                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="p-6 border-b border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-900">Class Comparison</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    {['Class', 'Students', 'Avg Score', 'Completion', 'Last Activity'].map((h) => (
                                                        <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {dashboardData.classes.map((classItem) => (
                                                    <tr key={classItem.assignment_id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="font-bold text-gray-900">{classItem.module_name}</div>
                                                            <div className="text-xs text-gray-500">Section {classItem.class_section}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {classItem.student_count}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classItem.class_avg_score >= 80 ? 'bg-green-100 text-green-800' :
                                                                classItem.class_avg_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-red-100 text-red-800'
                                                                }`}>
                                                                {classItem.class_avg_score.toFixed(1)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                                                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${classItem.completion_rate}%` }}></div>
                                                                </div>
                                                                <span className="text-xs text-gray-500">{classItem.completion_rate.toFixed(0)}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {classItem.last_activity ? format(new Date(classItem.last_activity), 'MMM dd') : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
