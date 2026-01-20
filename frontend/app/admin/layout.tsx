'use client';

import React from 'react';
import AdminSidebar from '@/components/ui/AdminSidebar';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            <AdminSidebar />
            <div className="md:ml-64 transition-all duration-300">
                {children}
            </div>
        </div>
    );
}
