'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { assignmentAPI } from '@/lib/api-client';
import { StudentAssignment } from '@/lib/types/assignment';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import StudentCard from '@/components/ui/StudentCard';
import StudentButton from '@/components/ui/StudentButton';
import { LuClipboardList, LuCheck, LuX, LuRotateCw, LuClock, LuGhost, LuSearch, LuInfo } from "react-icons/lu";

export default function ClientAssignments() {
    const router = useRouter();
    const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await assignmentAPI.getStudentAssignments();
                setAssignments(data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    if (loading) return <LoadingSpinner />;

    return (
        <ProtectedRoute requiredRole="student">
            <div className="min-h-screen bg-gray-50/50 pb-20">
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-brand-500 pb-32 text-white rounded-b-[3rem]">
                    <div className="max-w-7xl mx-auto px-6 py-12">
                        <h1 className="text-4xl font-black flex items-center gap-4"><LuClipboardList /> My Assignments</h1>
                    </div>
                </div>

                <main className="max-w-7xl mx-auto px-6 -mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignments.map(a => (
                        <StudentCard key={a.assignment_id} className="hover:shadow-xl transition-all">
                            <h3 className="font-bold text-xl mb-2">{a.title}</h3>
                            <p className="text-gray-500 mb-4">{a.module_name}</p>
                            <StudentButton onClick={() => router.push(`/student/modules/learn/${a.part_id}`)} className="w-full justify-center">
                                {a.passed ? 'Review' : 'Start'}
                            </StudentButton>
                        </StudentCard>
                    ))}
                </main>
            </div>
        </ProtectedRoute>
    );
}
