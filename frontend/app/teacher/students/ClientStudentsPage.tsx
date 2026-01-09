'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { teacherAPI } from '@/lib/api-client';
import { TeacherStudent } from '@/lib/types/teacher';
import StudentList from '@/components/teacher/StudentList';
import FilterPanel from '@/components/teacher/FilterPanel';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { LuUsers } from "react-icons/lu";

export default function ClientStudentsPage() {
    const router = useRouter();
    const [students, setStudents] = useState<TeacherStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<any>({});
    const [availableModules, setAvailableModules] = useState<Array<{ id: number; name: string }>>([]);
    const [availableSections, setAvailableSections] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch students with current filters
                const studentsData = await teacherAPI.getClassStudents(filters);
                setStudents(studentsData.students);

                // Fetch filter options (if not already loaded)
                if (availableModules.length === 0) {
                    const filterOptions = await teacherAPI.getDashboardFilters();
                    setAvailableModules(filterOptions.modules);
                    setAvailableSections(filterOptions.class_sections);
                }
            } catch (error) {
                console.error("Failed to fetch students:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters]);

    const handleStudentClick = (student: TeacherStudent) => {
        router.push(`/teacher/students/${student.student_id}`);
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-900 pb-32 relative text-white rounded-b-[3rem] shadow-xl shadow-indigo-900/20 z-0">
                <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-black text-white flex items-center gap-3">
                                <span className="p-2 bg-white/10 backdrop-blur-md rounded-2xl text-white border border-white/20 shadow-lg"><LuUsers className="w-8 h-8" /></span>
                                Students Directory
                            </h1>
                            <p className="text-indigo-100 text-lg font-medium mt-4 max-w-xl">
                                Manage and view all your students across classes. Track their progress and performance.
                            </p>
                        </div>
                    </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-purple-500/20 rounded-full blur-2xl opacity-30 pointer-events-none"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Filters Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <FilterPanel
                            filters={filters}
                            availableModules={availableModules}
                            availableSections={availableSections}
                            onFilterChange={setFilters}
                            onReset={() => setFilters({})}
                        />
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        {loading ? (
                            <div className="flex justify-center items-center h-64 bg-white/80 backdrop-blur-md rounded-[2rem] shadow-sm border border-white/50">
                                <LoadingSpinner />
                            </div>
                        ) : (
                            <StudentList
                                students={students}
                                onStudentClick={handleStudentClick}
                                showFilters={false} // We are using the main FilterPanel
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
