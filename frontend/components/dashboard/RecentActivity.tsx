'use client';

import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { RecentActivity as RecentActivityType } from '@/lib/types/dashboard';

interface RecentActivityProps {
    activities: RecentActivityType[];
    limit?: number;
}

export default function RecentActivity({ activities, limit = 5 }: RecentActivityProps) {
    const displayedActivities = activities.slice(0, limit);

    const getActivityIcon = (activity: RecentActivityType) => {
        if (activity.score !== null) return '📝';
        if (activity.content_title.toLowerCase().includes('video')) return '🎬';
        if (activity.content_title.toLowerCase().includes('presentation')) return '📊';
        return '📖';
    };

    const getActivityCategoryIcon = (activity: RecentActivityType) => {
        // Just reuse logic or add specific category icons if data available
        return '🔹';
    };

    const getActivityDescription = (activity: RecentActivityType) => {
        if (activity.score !== null) {
            return `Scored ${activity.score} points`;
        }
        if (activity.time_taken_minutes) {
            return `Completed in ${activity.time_taken_minutes} minutes`;
        }
        return 'Marked as completed';
    };

    if (displayedActivities.length === 0) {
        return (
            <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-3">📚</div>
                <p className="text-gray-600">No recent activity</p>
                <p className="text-sm text-gray-500 mt-1">Start learning to see your activity here</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {displayedActivities.map((activity, index) => (
                <div
                    key={index}
                    className="flex items-start gap-4 p-4 border border-gray-100/80 rounded-2xl hover:bg-white hover:shadow-lg hover:shadow-brand-500/5 hover:-translate-y-0.5 transition-all duration-300 bg-white/40"
                >
                    <div className="text-3xl p-2 bg-white rounded-xl shadow-sm shrink-0">
                        {getActivityIcon(activity)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-gray-900 truncate pr-2">{activity.content_title}</h4>
                                <p className="text-xs font-medium text-gray-500 mt-0.5 uppercase tracking-wide">
                                    {activity.module_name}
                                </p>
                            </div>
                            <span className="text-xs font-medium text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded-lg">
                                {formatDistanceToNow(new Date(activity.completed_at), { addSuffix: true })}
                            </span>
                        </div>

                        <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                            <span>{getActivityCategoryIcon(activity)}</span>
                            {getActivityDescription(activity)}
                        </p>

                        {activity.score !== null && (
                            <div className="mt-3 flex items-center gap-4">
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-100">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Score</span>
                                    <span className={`text-sm font-black ${activity.score >= 80 ? 'text-green-600' :
                                        activity.score >= 60 ? 'text-yellow-600' :
                                            'text-red-600'
                                        }`}>
                                        {activity.score}
                                    </span>
                                </div>
                                {activity.time_taken_minutes && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-100">
                                        <span className="text-xs font-bold text-gray-500 uppercase">Time</span>
                                        <span className="text-sm font-bold text-gray-700">
                                            {activity.time_taken_minutes}m
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {activities.length > limit && (
                <button
                    onClick={() => {
                        // Navigate to activity log page
                    }}
                    className="w-full mt-4 py-2 text-brand-600 font-medium hover:bg-brand-50 rounded-lg text-sm transition-colors"
                >
                    View All Activity
                </button>
            )}
        </div>
    );
}