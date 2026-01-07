'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { UpcomingAssignment } from '@/lib/types/dashboard';
import { format } from 'date-fns';

interface UpcomingAssignmentsProps {
    assignments: UpcomingAssignment[];
    limit?: number;
}

export default function UpcomingAssignments({ assignments, limit = 5 }: UpcomingAssignmentsProps) {
    const router = useRouter();

    const displayedAssignments = assignments.slice(0, limit);

    const getStatusBadge = (assignment: UpcomingAssignment) => {
        switch (assignment.status) {
            case 'available':
                return (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        Available
                    </span>
                );
            case 'not_started':
                return (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        Starts Soon
                    </span>
                );
            case 'completed':
                return (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                        Completed
                    </span>
                );
            default:
                return (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                        {assignment.status}
                    </span>
                );
        }
    };

    const getTimeRemaining = (endDate: string | null) => {
        if (!endDate) return null;

        const end = new Date(endDate);
        const now = new Date();
        const diffMs = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Overdue';
        if (diffDays === 0) return 'Due today';
        if (diffDays === 1) return 'Due tomorrow';
        return `Due in ${diffDays} days`;
    };

    const handleStartAssignment = (partId: number, canAttempt: boolean) => {
        if (canAttempt) {
            router.push(`/student/modules/learn/${partId}`);
        }
    };

    if (displayedAssignments.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Assignments</h3>
                <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-3">📝</div>
                    <p className="text-gray-600">No upcoming assignments</p>
                    <p className="text-sm text-gray-500 mt-1">Check back later for new assignments</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Upcoming Assignments</h3>
                <span className="text-sm text-gray-500">
                    {assignments.length} total
                </span>
            </div>

            <div className="space-y-4">
                {displayedAssignments.map((assignment) => (
                    <div
                        key={assignment.assignment_id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-medium text-gray-900">{assignment.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                    {assignment.module_name} • {assignment.unit_name}
                                </p>
                            </div>
                            {getStatusBadge(assignment)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div className="text-sm">
                                <span className="text-gray-500">Time Limit:</span>
                                <span className="font-medium ml-2">{assignment.time_limit_minutes} min</span>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-500">Marks:</span>
                                <span className="font-medium ml-2">{assignment.total_marks}</span>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-500">Attempts:</span>
                                <span className="font-medium ml-2">
                                    {assignment.attempts_used}/{assignment.max_attempts}
                                </span>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-500">Best Score:</span>
                                <span className="font-medium ml-2">
                                    {assignment.best_percentage ? `${assignment.best_percentage}%` : 'Not attempted'}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-4">
                            <div className="text-sm text-gray-500">
                                {assignment.end_date && (
                                    <>
                                        {getTimeRemaining(assignment.end_date)} •
                                        <span className="ml-2">
                                            {format(new Date(assignment.end_date), 'MMM dd, yyyy')}
                                        </span>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={() => handleStartAssignment(assignment.part_id, assignment.can_attempt)}
                                disabled={!assignment.can_attempt}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${assignment.can_attempt
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {assignment.attempts_used > 0 ? 'Continue' : 'Start'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {assignments.length > limit && (
                <button
                    onClick={() => router.push('/student/assignments')}
                    className="w-full mt-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                    View All Assignments ({assignments.length})
                </button>
            )}
        </div>
    );
}