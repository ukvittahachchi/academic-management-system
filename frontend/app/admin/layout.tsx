'use client';

import React, { useState } from 'react';
import AdminSidebar from '@/components/ui/AdminSidebar';
import { LuMenu } from 'react-icons/lu';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Desktop Sidebar */}
            <AdminSidebar className="hidden md:flex" />

            {/* Mobile Header */}
            <div className="md:hidden bg-white p-4 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-slate-900/20">
                        A
                    </div>
                    <span className="font-bold text-gray-900">Admin Portal</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                >
                    <LuMenu className="w-6 h-6" />
                </button>
            </div>

            {/* Mobile Sidebar (Drawer) */}
            {isSidebarOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                    <AdminSidebar
                        className="flex w-[280px] shadow-2xl animate-[slide-in-left_0.3s_ease-out] md:hidden"
                        onClose={() => setIsSidebarOpen(false)}
                    />
                </>
            )}

            <div className="md:ml-64 transition-all duration-300">
                {children}
            </div>
        </div>
    );
}
