import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LuUsers, LuBookOpen, LuGraduationCap } from 'react-icons/lu';

interface TeacherHeroProps {
    stats: {
        totalStudents: number;
        totalClasses: number;
        avgPerformance: number;
    };
}

export default function TeacherHero({ stats }: TeacherHeroProps) {
    const { user } = useAuth();

    return (
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 pb-32 relative overflow-hidden shadow-2xl shadow-indigo-500/20 isolate text-white rounded-b-[3rem]">
            {/* Abstract Shapes */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-400/20 rounded-full blur-2xl opacity-50 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-white flex items-center gap-4 mb-3 tracking-tight">
                            Welcome, {user?.username || 'Teacher'}! <span className="animate-pulse">👋</span>
                        </h1>
                        <p className="text-indigo-100 text-lg font-medium max-w-xl leading-relaxed">
                            Here's what's happening in your classes today.
                        </p>
                    </div>

                    {/* Stats Cards in Hero */}
                    <div className="flex flex-wrap gap-4 justify-center md:justify-end">
                        <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl font-black text-white border border-white/10 shadow-lg flex flex-col items-center min-w-[120px]">
                            <div className="text-3xl flex items-center gap-2">
                                <LuUsers className="text-yellow-300" /> {stats.totalStudents}
                            </div>
                            <span className="text-xs uppercase tracking-widest text-indigo-200">Students</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl font-black text-white border border-white/10 shadow-lg flex flex-col items-center min-w-[120px]">
                            <div className="text-3xl flex items-center gap-2">
                                <LuBookOpen className="text-green-300" /> {stats.totalClasses}
                            </div>
                            <span className="text-xs uppercase tracking-widest text-indigo-200">Classes</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl font-black text-white border border-white/10 shadow-lg flex flex-col items-center min-w-[120px]">
                            <div className="text-3xl flex items-center gap-2">
                                <LuGraduationCap className="text-pink-300" /> {stats.avgPerformance.toFixed(1)}
                            </div>
                            <span className="text-xs uppercase tracking-widest text-indigo-200">Avg Score</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
