'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { teacherAPI } from '@/lib/api-client';
import { TeacherStudent } from '@/lib/types/teacher';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { format } from 'date-fns';

export default function StudentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const studentId = parseInt(params.studentId as string);

    const [performanceData, setPerformanceData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStudentPerformance();
    }, [studentId]);

    const loadStudentPerformance = async () => {
        try {
            setLoading(true);
            const data = await teacherAPI.getStudentPerformance(studentId);
            setPerformanceData(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load student performance');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    if (error || performanceData.length === 0) {
        return (
            <div className="p-8">
                <ErrorMessage
                    error={error || "Student not found or no performance data available"}
                    onRetry={loadStudentPerformance}
                />
            </div>
        );
    }

    const studentInfo = performanceData[0];

    return (
        <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => router.back()}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ← Back
                                </button>
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">{studentInfo.full_name}</h1>
                                    <p className="text-gray-600 mt-1">
                                        Roll Number: {studentInfo.roll_number} • Class: {studentInfo.class_grade}
                                    </p>
                                </div>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => router.push(`/teacher/students/${studentId}/analytics`)}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium flex items-center"
                                >
                                    <span className="mr-2">📊</span>
                                    View Analytics
                                </button>
                                <button
                                    onClick={() => {/* Message student functionality */ }}
                                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm font-medium flex items-center"
                                >
                                    <span className="mr-2">✉️</span>
                                    Message Student
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Performance Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Overall Average</h3>
                            <div className="flex items-end">
                                <span className={`text-4xl font-bold ${studentInfo.avg_score >= 80 ? 'text-green-600' : studentInfo.avg_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {studentInfo.avg_score !== null && studentInfo.avg_score !== undefined ? Number(studentInfo.avg_score).toFixed(1) : 'N/A'}
                                </span>
                                <span className="text-gray-400 ml-2 mb-1">/ 100</span>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Completion Rate</h3>
                            <div className="flex items-end">
                                <span className="text-4xl font-bold text-blue-600">
                                    {(studentInfo.total_parts > 0 ? (studentInfo.completed_parts / studentInfo.total_parts) * 100 : 0).toFixed(1)}%
                                </span>
                                <span className="text-gray-400 ml-2 mb-1">{studentInfo.completed_parts} / {studentInfo.total_parts} parts</span>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Assignments</h3>
                            <div className="flex items-end">
                                <span className="text-4xl font-bold text-purple-600">
                                    {studentInfo.passed_assignments} / {studentInfo.total_assignments}
                                </span>
                                <span className="text-gray-400 ml-2 mb-1">passed</span>
                            </div>
                        </div>
                    </div>

                    {/* Modules List */}
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-900">Module Performance</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Score</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {performanceData.map((data, index) => (
                                        <tr key={index} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/teacher/students/${studentId}/analytics?module_id=${data.module_id}`)}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{data.module_name}</div>
                                                <div className="text-xs text-gray-500">{data.grade_level}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                                    Section {data.class_section}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="w-full bg-gray-200 rounded-full h-2 w-32">
                                                    <div
                                                        className="bg-blue-600 h-2 rounded-full"
                                                        style={{ width: `${(data.completed_parts / data.total_parts) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs text-gray-500 mt-1">
                                                    {Math.round((data.completed_parts / data.total_parts) * 100)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-bold ${data.avg_score >= 80 ? 'text-green-600' : data.avg_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {data.avg_score !== null && data.avg_score !== undefined ? Number(data.avg_score).toFixed(1) : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {data.last_activity_date ? format(new Date(data.last_activity_date), 'MMM dd, yyyy') : 'Never'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
