'use client';

import React from 'react';
import { LuTrophy, LuClock } from 'react-icons/lu';
import { DashboardOverview } from '@/lib/types/dashboard';

interface DashboardHeroProps {
    user: any; // Using any for now as User type import might need adjustment based on auth context
    stats: DashboardOverview;
}

export default function DashboardHero({ user, stats }: DashboardHeroProps) {
    return (
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-brand-500 pb-32 relative overflow-hidden shadow-2xl shadow-indigo-500/20 isolate text-white rounded-b-[3rem]">
            {/* Abstract Shapes */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-brand-400/20 rounded-full blur-2xl opacity-50 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-white flex items-center gap-4 mb-3 tracking-tight">
                            Hello, {user?.username || 'Student'}! <span className="animate-pulse">👋</span>
                        </h1>
                        <p className="text-indigo-100 text-lg font-medium max-w-xl leading-relaxed">
                            Ready to continue your learning journey? You're doing great!
                        </p>
                    </div>

                    {/* Stats Cards in Hero */}
                    <div className="flex gap-4">
                        <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl font-black text-white border border-white/10 shadow-lg flex flex-col items-center min-w-[120px]">
                            <div className="text-3xl flex items-center gap-2">
                                <LuTrophy className="text-yellow-300" /> {stats?.completed_parts || 0}
                            </div>
                            <span className="text-xs uppercase tracking-widest text-indigo-200">Lessons Done</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl font-black text-white border border-white/10 shadow-lg flex flex-col items-center min-w-[120px]">
                            <div className="text-3xl flex items-center gap-2">
                                <LuClock className="text-green-300" /> {Math.round((stats?.total_study_time_minutes || 0) / 60)}h
                            </div>
                            <span className="text-xs uppercase tracking-widest text-indigo-200">Learning Time</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
