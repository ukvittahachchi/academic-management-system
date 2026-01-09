'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import ReportGenerator from '@/components/reports/ReportGenerator';
import ReportsList from '@/components/reports/ReportsList';

export default function TeacherReportsPage() {
    return (
        <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Reports Management</h1>
                        <p className="text-gray-600 mt-2">
                            Generate and download academic performance and system reports
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                        {/* Report Generator Section */}
                        <section>
                            <ReportGenerator />
                        </section>

                        {/* Reports List Section */}
                        <section>
                            <ReportsList />
                        </section>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
