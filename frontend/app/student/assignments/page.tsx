'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { assignmentAPI } from '@/lib/api-client';
import { StudentAssignment } from '@/lib/types/assignment';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

export default function AssignmentsPage() {
    const router = useRouter();
    const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
    const [filteredAssignments, setFilteredAssignments] = useState<StudentAssignment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');

    useEffect(() => {
        loadAssignments();
    }, []);

    useEffect(() => {
        filterAssignments();
    }, [filter, searchTerm, assignments]);

    const loadAssignments = async () => {
        try {
            setLoading(true);
            const data = await assignmentAPI.getStudentAssignments();
            setAssignments(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load assignments');
        } finally {
            setLoading(false);
        }
    };

    const filterAssignments = () => {
        let filtered = [...assignments];

        // Apply filter
        if (filter === 'pending') {
            filtered = filtered.filter(a => a.passed === null && a.attempts_used === 0);
        } else if (filter === 'completed') {
            filtered = filtered.filter(a => a.passed === true);
        } else if (filter === 'failed') {
            filtered = filtered.filter(a => a.passed === false);
        }

        // Apply search
        if (searchTerm) {
            filtered = filtered.filter(a =>
                a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.module_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.unit_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredAssignments(filtered);
    };

    const getStatusBadge = (assignment: StudentAssignment) => {
        if (assignment.passed === true) {
            return (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    ✓ Completed
                </span>
            );
        } else if (assignment.passed === false) {
            return (
                <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                    ✗ Failed
                </span>
            );
        } else if (assignment.attempts_used && assignment.attempts_used > 0) {
            return (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                    🔄 In Progress
                </span>
            );
        } else {
            return (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    📝 Not Started
                </span>
            );
        }
    };

    const getAttemptsText = (assignment: StudentAssignment) => {
        if (assignment.attempts_used === null) {
            return '0 attempts used';
        }
        return `${assignment.attempts_used} of ${assignment.max_attempts} attempts used`;
    };

    const handleStartAssignment = (partId: number) => {
        router.push(`/student/modules/learn/${partId}`);
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
                <ErrorMessage error={error} onRetry={loadAssignments} />
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
                                <h1 className="text-3xl font-bold text-gray-900">My Assignments</h1>
                                <p className="text-gray-600 mt-2">
                                    Track and complete all your assignments
                                </p>
                            </div>
                            <div className="text-sm text-gray-500">
                                {assignments.length} assignments total
                            </div>
                        </div>
                    </div>
                </header>

                {/* Filters */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                            {/* Search */}
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Search assignments by title, module, or unit..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Filter Buttons */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-4 py-2 rounded-lg ${filter === 'all'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    All Assignments
                                </button>
                                <button
                                    onClick={() => setFilter('pending')}
                                    className={`px-4 py-2 rounded-lg ${filter === 'pending'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Pending
                                </button>
                                <button
                                    onClick={() => setFilter('completed')}
                                    className={`px-4 py-2 rounded-lg ${filter === 'completed'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Completed
                                </button>
                                <button
                                    onClick={() => setFilter('failed')}
                                    className={`px-4 py-2 rounded-lg ${filter === 'failed'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Failed
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Assignments Grid */}
                    {filteredAssignments.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-8 text-center">
                            <div className="text-gray-400 text-6xl mb-4">📚</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No assignments found
                            </h3>
                            <p className="text-gray-500">
                                {searchTerm || filter !== 'all'
                                    ? 'Try changing your search or filter'
                                    : 'No assignments assigned yet'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredAssignments.map((assignment) => (
                                <div
                                    key={assignment.assignment_id}
                                    className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                                >
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full mb-2 inline-block">
                                                    {assignment.module_name}
                                                </span>
                                                <h3 className="text-lg font-bold text-gray-900">
                                                    {assignment.title}
                                                </h3>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {assignment.unit_name}
                                                </p>
                                            </div>
                                            {getStatusBadge(assignment)}
                                        </div>

                                        <div className="space-y-3 mb-6">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Questions:</span>
                                                <span className="font-medium">{assignment.question_count}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Total Marks:</span>
                                                <span className="font-medium">{assignment.total_marks}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Time Limit:</span>
                                                <span className="font-medium">{assignment.time_limit_minutes} min</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Attempts:</span>
                                                <span className="font-medium">{getAttemptsText(assignment)}</span>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        {assignment.best_percentage !== null && (
                                            <div className="mb-6">
                                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                                    <span>Best Score</span>
                                                    <span>{assignment.best_percentage}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${assignment.best_percentage >= assignment.passing_marks
                                                            ? 'bg-green-500'
                                                            : 'bg-red-500'
                                                            }`}
                                                        style={{ width: `${Math.min(assignment.best_percentage, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span>0%</span>
                                                    <span>Pass: {assignment.passing_marks}%</span>
                                                    <span>100%</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => handleStartAssignment(assignment.part_id)}
                                                disabled={assignment.attempts_used !== null &&
                                                    assignment.attempts_used >= assignment.max_attempts}
                                                className={`w-full py-3 rounded-lg font-medium ${assignment.passed === true
                                                    ? 'bg-green-100 text-green-700 cursor-default'
                                                    : assignment.attempts_used !== null &&
                                                        assignment.attempts_used >= assignment.max_attempts
                                                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                    }`}
                                            >
                                                {assignment.passed === true
                                                    ? '✓ Assignment Completed'
                                                    : assignment.attempts_used !== null &&
                                                        assignment.attempts_used >= assignment.max_attempts
                                                        ? 'No Attempts Remaining'
                                                        : assignment.attempts_used && assignment.attempts_used > 0
                                                            ? 'Continue Attempt'
                                                            : 'Start Assignment'}
                                            </button>

                                            {assignment.last_attempt_at && (
                                                <button
                                                    onClick={() => {
                                                        // View previous attempts
                                                        // You can implement this
                                                    }}
                                                    className="w-full py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                                >
                                                    View Previous Attempts
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Stats Summary */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="text-2xl font-bold text-blue-600">{assignments.length}</div>
                            <div className="text-sm text-gray-500">Total Assignments</div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="text-2xl font-bold text-green-600">
                                {assignments.filter(a => a.passed === true).length}
                            </div>
                            <div className="text-sm text-gray-500">Completed</div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="text-2xl font-bold text-yellow-600">
                                {assignments.filter(a => a.passed === null && a.attempts_used === 0).length}
                            </div>
                            <div className="text-sm text-gray-500">Pending</div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="text-2xl font-bold text-red-600">
                                {assignments.filter(a => a.passed === false).length}
                            </div>
                            <div className="text-sm text-gray-500">Failed</div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}