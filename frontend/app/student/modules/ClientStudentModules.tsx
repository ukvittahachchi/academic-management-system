'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Module } from '@/lib/types/module';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import StudentButton from '@/components/ui/StudentButton';
import { LuSearch, LuBookOpen, LuChevronRight } from "react-icons/lu";

interface ClientStudentModulesProps {
    initialModules: any[] | null;
}

export default function ClientStudentModules({ initialModules }: ClientStudentModulesProps) {
    const router = useRouter();
    const [modules, setModules] = useState<Module[]>(initialModules || []);
    const [filteredModules, setFilteredModules] = useState<Module[]>(initialModules || []);
    // Only show loading if we really need to fetch (which we don't mostly) or valid initial state
    // If initialModules is null, it means server error.
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(initialModules === null ? 'Failed to load modules' : null);
    const [searchTerm, setSearchTerm] = useState<string>('');

    useEffect(() => {
        if (searchTerm) {
            setFilteredModules(modules.filter(m =>
                m.module_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()))
            ));
        } else {
            setFilteredModules(modules);
        }
    }, [searchTerm, modules]);

    if (loading) return <div className="flex justify-center items-center h-screen bg-gray-50/50"><LoadingSpinner /></div>;

    // We can allow retry via full page reload if initial load failed
    if (error && modules.length === 0) return (
        <div className="p-8 bg-gray-50/50 min-h-screen">
            <ErrorMessage error={error} onRetry={() => window.location.reload()} />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-brand-500 pb-32 relative overflow-hidden shadow-2xl shadow-indigo-500/20 isolate text-white rounded-b-[3rem]">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-brand-400/20 rounded-full blur-2xl opacity-50 pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                    <h1 className="text-4xl md:text-5xl font-black flex items-center gap-4 mb-3 tracking-tight">
                        <span className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg"><LuBookOpen className="w-8 h-8" /></span>
                        My Learning Modules
                    </h1>
                    <p className="text-indigo-100 text-lg font-medium max-w-xl">Browse your enrolled courses and track your progress.</p>
                </div>
            </div>

            {/* Search */}
            <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-20 mb-12">
                <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-4 shadow-xl border border-white/20 flex gap-4">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400"><LuSearch /></div>
                        <input
                            type="text"
                            placeholder="Search modules..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fade-in_0.5s_ease-out]">
                {filteredModules.length > 0 ? (
                    filteredModules.map((module) => (
                        <div key={module.module_id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group">
                            <div className="flex justify-between items-start mb-4">
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-wider rounded-lg border border-indigo-100">Core Module</span>
                                {(module.progress_percentage || 0) === 100 && <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">Completed</span>}
                            </div>

                            <h3 className="text-2xl font-black text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">{module.module_name}</h3>
                            <p className="text-gray-500 text-sm font-medium line-clamp-3 mb-6 flex-grow">{module.description}</p>

                            <div className="mt-auto space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wide">
                                        <span>Progress</span>
                                        <span>{module.progress_percentage || 0}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000" style={{ width: `${module.progress_percentage || 0}%` }}></div>
                                    </div>
                                </div>

                                <StudentButton
                                    onClick={() => router.push(`/student/modules/${module.module_id}/navigation`)}
                                    className="w-full justify-between group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                                >
                                    <span className="font-bold">{(module.progress_percentage || 0) > 0 ? 'Continue' : 'Start'} Learning</span>
                                    <LuChevronRight className="group-hover:translate-x-1 transition-transform" />
                                </StudentButton>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 text-gray-400">
                        <div className="text-6xl mb-4 flex justify-center"><LuBookOpen /></div>
                        <p className="font-medium text-lg">No modules found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
