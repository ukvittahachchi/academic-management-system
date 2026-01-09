'use client';

import React from 'react';
import TeacherSidebar from '@/components/ui/TeacherSidebar';

export default function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            <TeacherSidebar />
            <div className="md:ml-64 transition-all duration-300">
                {children}
            </div>
        </div>
    );
}
