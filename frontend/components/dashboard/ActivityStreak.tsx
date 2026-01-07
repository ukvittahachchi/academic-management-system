'use client';

import React from 'react';
import { format, subDays } from 'date-fns';

interface ActivityStreakProps {
    streak: number;
    recentActivity: Array<{
        date: string;
        completed: number;
    }>;
}

export default function ActivityStreak({ streak, recentActivity }: ActivityStreakProps) {
    // Generate last 30 days
    const days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        return format(date, 'yyyy-MM-dd');
    });

    // Create activity map
    const activityMap = new Map();
    recentActivity.forEach(activity => {
        activityMap.set(activity.date, activity.completed);
    });

    const getStreakLevel = (streak: number) => {
        if (streak >= 30) return { color: 'bg-gradient-to-r from-yellow-500 to-orange-500', label: '🔥 Master' };
        if (streak >= 21) return { color: 'bg-gradient-to-r from-purple-500 to-pink-500', label: '⚡ Elite' };
        if (streak >= 14) return { color: 'bg-gradient-to-r from-green-500 to-teal-500', label: '🚀 Pro' };
        if (streak >= 7) return { color: 'bg-gradient-to-r from-blue-500 to-cyan-500', label: '⭐ Active' };
        return { color: 'bg-gradient-to-r from-gray-500 to-gray-400', label: '🌱 Beginner' };
    };

    const streakLevel = getStreakLevel(streak);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Activity Streak</h3>
                    <p className="text-sm text-gray-600">Keep learning every day!</p>
                </div>
                <div className={`px-4 py-2 ${streakLevel.color} text-white rounded-full font-bold`}>
                    {streak} days
                </div>
            </div>

            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{streakLevel.label}</span>
                    <span className="text-xs text-gray-500">{streak}/30 days</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full ${streakLevel.color.split(' ')[0]} transition-all duration-500`}
                        style={{ width: `${Math.min((streak / 30) * 100, 100)}%` }}
                    ></div>
                </div>
            </div>

            <div className="grid grid-cols-10 gap-1 mb-6">
                {days.map((date, index) => {
                    const completed = activityMap.get(date) || 0;
                    const isActive = completed > 0;

                    return (
                        <div key={date} className="flex flex-col items-center">
                            <div
                                className={`w-4 h-4 rounded-sm mb-1 ${isActive
                                        ? streak >= 21 ? 'bg-purple-500' :
                                            streak >= 14 ? 'bg-green-500' :
                                                streak >= 7 ? 'bg-blue-500' :
                                                    'bg-gray-400'
                                        : 'bg-gray-200'
                                    }`}
                                title={`${date}: ${completed} completed`}
                            ></div>
                            <span className="text-xs text-gray-400">
                                {format(new Date(date), 'dd')}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Today's Progress</span>
                    <span className="font-medium">
                        {activityMap.get(format(new Date(), 'yyyy-MM-dd')) || 0} items
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Weekly Average</span>
                    <span className="font-medium">
                        {Math.round(recentActivity.reduce((sum, a) => sum + a.completed, 0) / 7)} items/day
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Next Milestone</span>
                    <span className="font-medium text-blue-600">
                        {streak < 7 ? '7 days' : streak < 14 ? '14 days' : streak < 21 ? '21 days' : '30 days'}
                    </span>
                </div>
            </div>
        </div>
    );
}