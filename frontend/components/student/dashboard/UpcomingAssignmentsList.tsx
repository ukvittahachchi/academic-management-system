'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { LuCalendar, LuClock } from 'react-icons/lu';
import StudentButton from '@/components/ui/StudentButton';
import { UpcomingAssignment } from '@/lib/types/dashboard';

interface UpcomingAssignmentsListProps {
    assignments: UpcomingAssignment[];
}

export default function UpcomingAssignmentsList({ assignments }: UpcomingAssignmentsListProps) {
    const router = useRouter();

    return (
        <div className="bg-white rounded-[2rem] p-8 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-gray-900">Up Next</h2>
                <StudentButton variant="ghost" size="sm" onClick={() => router.push('/student/assignments')}>View All</StudentButton>
            </div>

            <div className="space-y-4">
                {assignments && assignments.length > 0 ? (
                    assignments.map((assignment: UpcomingAssignment) => (
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
    );
}
