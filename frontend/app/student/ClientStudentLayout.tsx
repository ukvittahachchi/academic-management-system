'use client';

import React from 'react';
import StudentSidebar from '@/components/ui/StudentSidebar';
import { LayoutProvider, useLayout } from '@/contexts/LayoutContext';

function StudentLayoutContent({ children }: { children: React.ReactNode }) {
    const { isSidebarHidden } = useLayout();

    return (
        <div className="min-h-screen bg-surface-50">
            {!isSidebarHidden && <StudentSidebar />}
            <div className={`${!isSidebarHidden ? 'md:ml-64' : ''} transition-all duration-300`}>
                {children}
            </div>
        </div>
    );
}

export default function ClientStudentLayout({ children }: { children: React.ReactNode }) {
    return (
        <LayoutProvider>
            <StudentLayoutContent>
                {children}
            </StudentLayoutContent>
        </LayoutProvider>
    );
}
