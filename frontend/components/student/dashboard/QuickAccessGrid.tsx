'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LuBookOpen, LuActivity, LuUser, LuDownload } from 'react-icons/lu';

export default function QuickAccessGrid() {
    const router = useRouter();

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-20 relative z-20 mb-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <button onClick={() => router.push('/student/modules')} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-indigo-500/10 border border-white/50 hover:-translate-y-1 hover:shadow-2xl transition-all group text-left">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                        <LuBookOpen className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">My Modules</h3>
                    <p className="text-gray-500 text-sm font-medium mt-1">Access your courses</p>
                </button>

                <button onClick={() => router.push('/student/assignments')} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-indigo-500/10 border border-white/50 hover:-translate-y-1 hover:shadow-2xl transition-all group text-left">
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                        <LuActivity className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Assignments</h3>
                    <p className="text-gray-500 text-sm font-medium mt-1">Check pending tasks</p>
                </button>

                <button onClick={() => router.push('/student/profile')} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-indigo-500/10 border border-white/50 hover:-translate-y-1 hover:shadow-2xl transition-all group text-left">
                    <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-600 mb-4 group-hover:scale-110 transition-transform">
                        <LuUser className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">My Profile</h3>
                    <p className="text-gray-500 text-sm font-medium mt-1">View stats & settings</p>
                </button>

                <button onClick={() => router.push('/student/downloads')} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-indigo-500/10 border border-white/50 hover:-translate-y-1 hover:shadow-2xl transition-all group text-left">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                        <LuDownload className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Downloads</h3>
                    <p className="text-gray-500 text-sm font-medium mt-1">Offline materials</p>
                </button>
            </div>
        </div>
    );
}
