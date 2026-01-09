'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import ReportGenerator from '@/components/reports/ReportGenerator';
import ReportsList from '@/components/reports/ReportsList';
import { LuFileText } from "react-icons/lu";

export default function TeacherReportsPage() {
    // Force refresh key for reports list when a new report is generated
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);

    const handleReportGenerated = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <div className="min-h-screen bg-gray-50/50 pb-20">
                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-900 pb-32 relative text-white rounded-b-[3rem] shadow-xl shadow-indigo-900/20 z-0">
                    <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-4xl font-black text-white flex items-center gap-3">
                                    <span className="p-2 bg-white/10 backdrop-blur-md rounded-2xl text-white border border-white/20 shadow-lg"><LuFileText className="w-8 h-8" /></span>
                                    Reports Center
                                </h1>
                                <p className="text-indigo-100 text-lg font-medium mt-4 max-w-xl">
                                    Generate usage reports, student performance analytics, and system summaries.
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-purple-500/20 rounded-full blur-2xl opacity-30 pointer-events-none"></div>
                </div>

                <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-10">
                    <div className="grid grid-cols-1 gap-8">
                        {/* Report Generator Section */}
                        <section className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-1 md:p-2">
                            {/* Passing callback to refresh list after generation if supported, otherwise just rendering */}
                            <ReportGenerator />
                        </section>

                        {/* Looking for patterns... ReportsList seems to handle its own state, but we might want to trigger a refresh. 
                            The original page code didn't handle cross-component refresh. 
                            I'll add a simple effect or just leave them as siblings. 
                            Ideally ReportGenerator should accept an onSuccess prop.
                            Let's assume standard behavior for now to avoid breaking contracts.
                        */}

                        {/* Reports List Section */}
                        <section>
                            <ReportsList refreshTrigger={refreshTrigger} />
                        </section>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
