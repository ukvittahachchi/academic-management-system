'use client';

import React from 'react';

interface Recommendation {
    type: 'weak_area' | 'study_habit' | 'content_performance';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
    estimated_time: string;
    resources: string[];
}

interface RecommendationsProps {
    recommendations: Recommendation[];
    studentName: string;
}

export default function Recommendations({ recommendations, studentName }: RecommendationsProps) {
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'weak_area': return '🎯';
            case 'study_habit': return '⏱️';
            case 'content_performance': return '📊';
            default: return '💡';
        }
    };

    const groupedByPriority = recommendations.reduce((groups, rec) => {
        if (!groups[rec.priority]) {
            groups[rec.priority] = [];
        }
        groups[rec.priority].push(rec);
        return groups;
    }, {} as Record<string, Recommendation[]>);

    return (
        <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Improvement Recommendations</h3>
                <p className="text-sm text-gray-600 mt-1">
                    Personalized suggestions for {studentName}'s learning improvement
                </p>
            </div>

            <div className="p-6">
                {/* Priority Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {['high', 'medium', 'low'].map((priority) => {
                        const count = groupedByPriority[priority]?.length || 0;
                        return (
                            <div key={priority} className={`p-4 rounded-lg border ${getPriorityColor(priority)}`}>
                                <div className="flex items-center justify-between">
                                    <span className="font-medium capitalize">{priority} Priority</span>
                                    <span className="text-2xl font-bold">{count}</span>
                                </div>
                                <div className="text-sm mt-1">
                                    {count === 0 ? 'No recommendations' : 'Recommendations'}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Recommendations List */}
                <div className="space-y-6">
                    {Object.entries(groupedByPriority)
                        .sort(([a], [b]) => {
                            const order = { high: 0, medium: 1, low: 2 };
                            return order[a as keyof typeof order] - order[b as keyof typeof order];
                        })
                        .map(([priority, recs]) => (
                            <div key={priority}>
                                <h4 className={`font-semibold mb-4 capitalize ${getPriorityColor(priority).split(' ')[1]}`}>
                                    {priority} Priority Recommendations
                                </h4>

                                <div className="space-y-4">
                                    {recs.map((rec, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 hover:bg-blue-50 transition-colors">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-start space-x-3">
                                                    <div className="text-2xl">
                                                        {getTypeIcon(rec.type)}
                                                    </div>
                                                    <div>
                                                        <h5 className="font-semibold text-gray-900">{rec.title}</h5>
                                                        <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                                                    {rec.priority.toUpperCase()}
                                                </span>
                                            </div>

                                            <div className="bg-gray-50 p-3 rounded mb-3">
                                                <div className="flex items-center text-sm text-gray-700 mb-2">
                                                    <span className="font-medium mr-2">📋 Action:</span>
                                                    <span>{rec.action}</span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-700">
                                                    <span className="font-medium mr-2">⏰ Estimated Time:</span>
                                                    <span>{rec.estimated_time}</span>
                                                </div>
                                            </div>

                                            {rec.resources.length > 0 && (
                                                <div>
                                                    <h6 className="text-sm font-medium text-gray-700 mb-2">📚 Recommended Resources:</h6>
                                                    <div className="flex flex-wrap gap-2">
                                                        {rec.resources.map((resource, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                                                            >
                                                                {resource}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                </div>

                {recommendations.length === 0 && (
                    <div className="text-center py-8">
                        <div className="text-green-400 text-4xl mb-3">🎉</div>
                        <p className="text-gray-600">No improvement recommendations needed</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Your learning patterns and performance are excellent!
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                {recommendations.length > 0 && (
                    <div className="mt-8 pt-6 border-t">
                        <h4 className="font-medium text-gray-900 mb-4">Take Action</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-center">
                                <div className="text-2xl mb-2">📅</div>
                                <div className="font-medium text-blue-700">Create Study Plan</div>
                            </button>
                            <button className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 text-center">
                                <div className="text-2xl mb-2">📚</div>
                                <div className="font-medium text-green-700">Review Resources</div>
                            </button>
                            <button className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 text-center">
                                <div className="text-2xl mb-2">📊</div>
                                <div className="font-medium text-purple-700">Track Progress</div>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}