'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { LuLayoutDashboard, LuBookOpen, LuClipboardList, LuFileText, LuUsers, LuLogOut, LuUser } from "react-icons/lu";

export default function TeacherSidebar() {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        try {
            await apiClient.logout();
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            router.push('/login');
        }
    };

    const menuItems = [
        { icon: <LuLayoutDashboard />, label: 'Dashboard', href: '/teacher/Dashboard' },
        // { icon: <LuClipboardList />, label: 'Assignments', href: '/teacher/assignments' },
        { icon: <LuFileText />, label: 'Reports', href: '/teacher/reports' },
        { icon: <LuUsers />, label: 'Students', href: '/teacher/students' },
        { icon: <LuUser />, label: 'Profile', href: '/teacher/profile' },
    ];

    return (
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 h-screen fixed left-0 top-0 overflow-y-auto z-50">
            <div className="p-8 pb-4">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-600/20">
                        T
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 tracking-tight">ICT Academy</h1>
                </div>

                <nav className="space-y-2">
                    {menuItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 group ${isActive
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                    : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
                                    }`}
                            >
                                <span className={`text-xl transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                    {item.icon}
                                </span>
                                <span className="font-bold text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto p-8 pt-4">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 w-full group mb-6"
                >
                    <span className="text-xl group-hover:scale-110 transition-transform"><LuLogOut /></span>
                    <span className="font-bold text-sm">Logout</span>
                </button>

                <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-xs font-bold text-indigo-600 mb-2">TEACHER PORTAL</p>
                    <p className="text-xs text-gray-400 font-medium">Manage your classes and students efficiently.</p>
                </div>
            </div>
        </aside>
    );
}
