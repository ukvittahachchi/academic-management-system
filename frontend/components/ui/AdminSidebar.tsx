'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
    LuLayoutDashboard,
    LuBookOpen,
    LuUsers,
    LuShieldAlert,
    LuSettings,
    LuLogOut,
    LuUser
} from "react-icons/lu";

export default function AdminSidebar() {
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
        { icon: <LuLayoutDashboard />, label: 'Dashboard', href: '/admin' },
        { icon: <LuUsers />, label: 'Users', href: '/admin/users' },
        { icon: <LuBookOpen />, label: 'Modules', href: '/admin/modules' },
        { icon: <LuShieldAlert />, label: 'Audit Logs', href: '/admin/audit-logs' },
        { icon: <LuSettings />, label: 'Settings', href: '/admin/settings' },
        { icon: <LuUser />, label: 'Profile', href: '/admin/profile' },
    ];

    return (
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 h-screen fixed left-0 top-0 overflow-y-auto z-50">
            <div className="p-8 pb-4">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-slate-900/20">
                        A
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">Admin Portal</h1>
                </div>

                <nav className="space-y-2">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 group ${isActive
                                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/30'
                                    : 'text-gray-500 hover:bg-slate-50 hover:text-slate-900'
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

                <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-xs font-bold text-slate-900 mb-2">SYSTEM STATUS</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-xs text-gray-500 font-medium">All systems operational</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
