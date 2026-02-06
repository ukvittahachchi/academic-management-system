'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { LuPlay } from 'react-icons/lu';
import StudentButton from '@/components/ui/StudentButton';
import { RecentActivity } from '@/lib/types/dashboard';

interface RecentActivityListProps {
    activities: RecentActivity[];
}

export default function RecentActivityList({ activities }: RecentActivityListProps) {
    const router = useRouter();

    return (
        <div className="bg-white rounded-[2rem] p-8 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-gray-900">Recent Activity</h2>
                <StudentButton variant="ghost" size="sm" onClick={() => router.push('/student/modules')}>View All</StudentButton>
            </div>

            <div className="space-y-4">
                {activities && activities.length > 0 ? (
                    activities.map((activity: RecentActivity, index: number) => (
                        <div key={index} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                            <div className={`p-3 rounded-xl bg-indigo-100 text-indigo-600`}>
                                <LuPlay />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900">{activity.content_title}</h4>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">{activity.module_name}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-gray-400 block">
                                    {activity.completed_at ? format(new Date(activity.completed_at), 'MMM d') : '-'}
                                </span>
                                {activity.score !== null && <span className="text-sm font-black text-green-500">{activity.score}%</span>}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-gray-400">
                        <p>No recent activity yet. Start a lesson!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
