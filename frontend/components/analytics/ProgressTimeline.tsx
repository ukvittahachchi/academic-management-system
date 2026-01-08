'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';

interface ProgressItem {
    content_title: string;
    part_type: string;
    module_name: string;
    status: string;
    score: number | null;
    completed_at: string;
    time_spent_seconds: number;
    duration_minutes: number;
    days_to_complete: number;
    score_category: string;
}

interface ProgressTimelineProps {
    progressItems: ProgressItem[];
    studentName: string;
}

export default function ProgressTimeline({ progressItems, studentName }: ProgressTimelineProps) {
    const getStatusIcon = (status: string, scoreCategory: string) => {
        if (status !== 'completed') return '⏳';

        switch (scoreCategory) {
            case 'excellent': return '⭐';
            case 'good': return '✅';
            case 'average': return '📊';
            case 'needs_improvement': return '📉';
            default: return '📝';
        }
    };

    const getStatusColor = (status: string, scoreCategory: string) => {
        if (status !== 'completed') return 'bg-gray-100 text-gray-800';

        switch (scoreCategory) {
            case 'excellent': return 'bg-green-100 text-green-800';
            case 'good': return 'bg-blue-100 text-blue-800';
            case 'average': return 'bg-yellow-100 text-yellow-800';
            case 'needs_improvement': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    // Group by date
    const groupedByDate = progressItems.reduce((groups, item) => {
        const date = format(parseISO(item.completed_at), 'MMM dd, yyyy');
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(item);
        return groups;
    }, {} as Record<string, ProgressItem[]>);

    return (
        <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Progress Timeline</h3>
                <p className="text-sm text-gray-600 mt-1">
                    {studentName}'s learning journey over time
                </p>
            </div>

            <div className="p-6">
                {Object.entries(groupedByDate).map(([date, items]) => (
                    <div key={date} className="mb-8">
                        <div className="flex items-center mb-4">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <h4 className="ml-3 text-lg font-semibold text-gray-900">{date}</h4>
                            <span className="ml-auto text-sm text-gray-500">
                                {items.length} items
                            </span>
                        </div>

                        <div className="ml-3 pl-6 border-l border-gray-200 space-y-6">
                            {items.map((item, index) => (
                                <div key={index} className="relative">
                                    {/* Timeline dot */}
                                    <div className="absolute -left-9 mt-1">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getStatusColor(item.status, item.score_category)}`}>
                                            {getStatusIcon(item.status, item.score_category)}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h5 className="font-medium text-gray-900">
                                                    {item.content_title}
                                                </h5>
                                                <div className="flex items-center space-x-3 mt-1 text-sm text-gray-600">
                                                    <span className="capitalize">{item.part_type}</span>
                                                    <span>•</span>
                                                    <span>{item.module_name}</span>
                                                    <span>•</span>
                                                    <span>{formatDuration(item.duration_minutes)}</span>
                                                </div>
                                            </div>

                                            {item.score !== null && (
                                                <div className="text-right">
                                                    <div className={`text-lg font-bold ${item.score >= 80 ? 'text-green-600' :
                                                            item.score >= 60 ? 'text-yellow-600' :
                                                                'text-red-600'
                                                        }`}>
                                                        {item.score}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Score</div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3 flex items-center justify-between text-sm">
                                            <div className="flex items-center space-x-4">
                                                <span className="flex items-center">
                                                    <span className="text-gray-500 mr-1">⏱️</span>
                                                    <span>{formatDuration(item.duration_minutes)}</span>
                                                </span>

                                                {item.days_to_complete > 0 && (
                                                    <span className="flex items-center">
                                                        <span className="text-gray-500 mr-1">📅</span>
                                                        <span>{item.days_to_complete} day{item.days_to_complete !== 1 ? 's' : ''}</span>
                                                    </span>
                                                )}
                                            </div>

                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status, item.score_category)}`}>
                                                {item.score_category?.replace('_', ' ') || item.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {progressItems.length === 0 && (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-3">📚</div>
                        <p className="text-gray-600">No progress data available</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Start learning to see progress here
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}