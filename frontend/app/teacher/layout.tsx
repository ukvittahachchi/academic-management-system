'use client';

import React, { useState } from 'react';
import TeacherSidebar from '@/components/ui/TeacherSidebar';
import { LuMenu } from 'react-icons/lu';

export default function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Desktop Sidebar */}
            <TeacherSidebar className="hidden md:flex" />

            {/* Mobile Header */}
            <div className="md:hidden bg-white p-4 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/20">
                        T
                    </div>
                    <span className="font-bold text-gray-900">Teacher Portal</span>
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
                    <TeacherSidebar
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
