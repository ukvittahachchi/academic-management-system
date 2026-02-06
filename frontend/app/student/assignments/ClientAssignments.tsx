'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentAssignment } from '@/lib/types/assignment';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import StudentCard from '@/components/ui/StudentCard';
import StudentButton from '@/components/ui/StudentButton';
import { LuClipboardList } from "react-icons/lu";

interface ClientAssignmentsProps {
    initialAssignments: StudentAssignment[] | null;
}

export default function ClientAssignments({ initialAssignments }: ClientAssignmentsProps) {
    const router = useRouter();
    const [assignments] = useState<StudentAssignment[]>(initialAssignments || []);

    // If null, it means fetch failed. We could show error or empty state.
    if (initialAssignments === null) {
        return (
            <div className="flex items-center justify-center p-8 min-h-screen">
                <p>Failed to load assignments. Please Refresh.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-brand-500 pb-32 text-white rounded-b-[3rem]">
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <h1 className="text-4xl font-black flex items-center gap-4"><LuClipboardList /> My Assignments</h1>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 -mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.length > 0 ? (
                    assignments.map(a => (
                        <StudentCard key={a.assignment_id} className="hover:shadow-xl transition-all">
                            <h3 className="font-bold text-xl mb-2">{a.title}</h3>
                            <p className="text-gray-500 mb-4">{a.module_name}</p>
                            <StudentButton onClick={() => router.push(`/student/modules/learn/${a.part_id}`)} className="w-full justify-center">
                                {a.passed ? 'Review' : 'Start'}
                            </StudentButton>
                        </StudentCard>
                    ))
                ) : (
                    <div className="col-span-full text-center py-10 bg-white rounded-2xl shadow-sm">
                        <p className="text-gray-500">No assignments found.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
