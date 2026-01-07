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
            <div className="text-center py-8">
                <div className="text-gray-300 text-5xl mb-4 grayscale opacity-50">📝</div>
                <p className="text-gray-900 font-medium text-lg">No upcoming assignments</p>
                <p className="text-sm text-gray-500 mt-2">Check back later for new tasks!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header removed as it is now handled by StudentCard title */}

            {displayedAssignments.map((assignment) => (
                <div
                    key={assignment.assignment_id}
                    className="group p-4 border border-gray-100/80 bg-white/50 rounded-2xl hover:border-brand-200 hover:bg-white hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-300 relative overflow-hidden"
                >
                    <div className="flex justify-between items-start mb-3 relative z-10">
                        <div>
                            <h4 className="font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{assignment.title}</h4>
                            <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">
                                {assignment.module_name} • {assignment.unit_name}
                            </p>
                        </div>
                        {getStatusBadge(assignment)}
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-4 text-sm relative z-10">
                        <div className="flex items-center text-gray-600">
                            <span className="w-4 h-4 mr-2 opacity-70">⏱️</span>
                            <span className="font-medium">{assignment.time_limit_minutes} min</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                            <span className="w-4 h-4 mr-2 opacity-70">🎯</span>
                            <span className="font-medium">{assignment.total_marks} marks</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-2 relative z-10 pt-3 border-t border-gray-100">
                        <div className="text-xs font-semibold text-gray-500 flex items-center">
                            {assignment.end_date && (
                                <>
                                    <span className={getTimeRemaining(assignment.end_date)?.includes('Overdue') ? 'text-red-500' : 'text-brand-500'}>
                                        {getTimeRemaining(assignment.end_date)}
                                    </span>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => handleStartAssignment(assignment.part_id, assignment.can_attempt)}
                            disabled={!assignment.can_attempt}
                            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all transform active:scale-95 ${assignment.can_attempt
                                ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-md hover:shadow-lg shadow-brand-500/20'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {assignment.attempts_used > 0 ? 'Continue' : 'Start'}
                        </button>
                    </div>
                </div>
            ))}

            {assignments.length > limit && (
                <button
                    onClick={() => router.push('/student/assignments')}
                    className="w-full mt-2 py-3 border-2 border-dashed border-gray-200 text-gray-500 font-bold rounded-2xl hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all duration-300 text-sm"
                >
                    View All Assignments ({assignments.length})
                </button>
            )}
        </div>
    );
}