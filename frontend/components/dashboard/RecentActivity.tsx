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
        if (activity.score !== null) {
            return '📝'; // Assignment/quiz
        }
        if (activity.content_title.toLowerCase().includes('video')) {
            return '🎬'; // Video
        }
        if (activity.content_title.toLowerCase().includes('presentation')) {
            return '📊'; // Presentation
        }
        return '📖'; // Reading
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
            <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-3">📚</div>
                    <p className="text-gray-600">No recent activity</p>
                    <p className="text-sm text-gray-500 mt-1">Start learning to see your activity here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <span className="text-sm text-gray-500">
                    {activities.length} activities
                </span>
            </div>

            <div className="space-y-4">
                {displayedActivities.map((activity, index) => (
                    <div
                        key={index}
                        className="flex items-start space-x-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <div className="text-2xl">
                            {getActivityIcon(activity)}
                        </div>

                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-medium text-gray-900">{activity.content_title}</h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {activity.module_name} • {getActivityDescription(activity)}
                                    </p>
                                </div>
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatDistanceToNow(new Date(activity.completed_at), { addSuffix: true })}
                                </span>
                            </div>

                            {activity.score !== null && (
                                <div className="mt-2 flex items-center space-x-4">
                                    <div className="flex items-center space-x-1">
                                        <span className="text-xs text-gray-500">Score:</span>
                                        <span className={`text-sm font-medium ${activity.score >= 80 ? 'text-green-600' :
                                                activity.score >= 60 ? 'text-yellow-600' :
                                                    'text-red-600'
                                            }`}>
                                            {activity.score}
                                        </span>
                                    </div>
                                    {activity.time_taken_minutes && (
                                        <div className="flex items-center space-x-1">
                                            <span className="text-xs text-gray-500">Time:</span>
                                            <span className="text-sm font-medium">
                                                {activity.time_taken_minutes} min
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {activities.length > limit && (
                <button
                    onClick={() => {
                        // Navigate to activity log page
                        // You can implement this
                    }}
                    className="w-full mt-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                    View All Activity
                </button>
            )}
        </div>
    );
}