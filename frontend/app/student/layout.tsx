'use client';

import React from 'react';
import StudentSidebar from '@/components/ui/StudentSidebar';

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-surface-50">
            <StudentSidebar />
            <div className="md:ml-64 transition-all duration-300">
                {children}
            </div>
        </div>
    );
}
