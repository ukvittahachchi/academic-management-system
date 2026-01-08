'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';

interface AssignmentAnalysisProps {
    assignments: Array<{
        assignment_name: string;
        module_name: string;
        score: number;
        total_marks: number;
        percentage: number;
        time_taken_minutes: number;
        submitted_at: string;
        accuracy_percentage: number;
        total_correct: number;
        total_questions: number;
        avg_time_per_question: number;
        result_status: 'passed' | 'failed';
    }>;
    studentName: string;
}

export default function AssignmentAnalysis({ assignments, studentName }: AssignmentAnalysisProps) {
    const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);

    const getPerformanceColor = (percentage: number) => {
        if (percentage >= 80) return 'text-green-600';
        if (percentage >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getStatusBadge = (status: 'passed' | 'failed') => {
        return status === 'passed'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800';
    };

    const calculateStats = () => {
        const total = assignments.length;
        const passed = assignments.filter(a => a.result_status === 'passed').length;
        const avgScore = assignments.reduce((sum, a) => sum + a.percentage, 0) / total;
        const avgTime = assignments.reduce((sum, a) => sum + a.time_taken_minutes, 0) / total;
        const avgAccuracy = assignments.reduce((sum, a) => sum + (a.accuracy_percentage || 0), 0) / total;

        return { total, passed, avgScore, avgTime, avgAccuracy };
    };

    const stats = calculateStats();

    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${Math.round(minutes)}m`;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Assignment Performance</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            {studentName}'s assignment analysis and results
                        </p>
                    </div>
                    <div className="text-sm text-gray-500">
                        {stats.passed}/{stats.total} passed
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="p-6 border-b bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                        <div className="text-sm text-gray-600">Total Assignments</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
                        <div className="text-sm text-gray-600">Passed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {stats.avgScore.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Avg Score</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                            {formatTime(stats.avgTime)}
                        </div>
                        <div className="text-sm text-gray-600">Avg Time</div>
                    </div>
                </div>
            </div>

            {/* Assignments List */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Assignment
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Score
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Accuracy
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {assignments.map((assignment, index) => (
                            <tr
                                key={index}
                                className={`hover:bg-gray-50 cursor-pointer ${selectedAssignment === index ? 'bg-blue-50' : ''
                                    }`}
                                onClick={() => setSelectedAssignment(
                                    selectedAssignment === index ? null : index
                                )}
                            >
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">
                                        {assignment.assignment_name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {assignment.module_name}
                                    </div>
                                </td>

                                <td className="px-6 py-4">
                                    <div className="text-center">
                                        <div className={`text-lg font-bold ${getPerformanceColor(assignment.percentage)}`}>
                                            {assignment.percentage}%
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {assignment.score}/{assignment.total_marks}
                                        </div>
                                    </div>
                                </td>

                                <td className="px-6 py-4">
                                    {assignment.accuracy_percentage ? (
                                        <div className="text-center">
                                            <div className="text-lg font-bold">
                                                {assignment.accuracy_percentage}%
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {assignment.total_correct}/{assignment.total_questions}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-500">N/A</span>
                                    )}
                                </td>

                                <td className="px-6 py-4">
                                    <div className="text-center">
                                        <div className="font-medium">
                                            {formatTime(assignment.time_taken_minutes)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {assignment.avg_time_per_question?.toFixed(1)}s/q
                                        </div>
                                    </div>
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {format(new Date(assignment.submitted_at), 'MMM dd, yyyy')}
                                </td>

                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(assignment.result_status)}`}>
                                        {assignment.result_status.toUpperCase()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Selected Assignment Details */}
            {selectedAssignment !== null && assignments[selectedAssignment] && (
                <div className="p-6 border-t bg-blue-50">
                    <div className="flex justify-between items-start mb-4">
                        <h4 className="font-semibold text-gray-900">
                            Detailed Analysis: {assignments[selectedAssignment].assignment_name}
                        </h4>
                        <button
                            onClick={() => setSelectedAssignment(null)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Performance Metrics</h5>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Score:</span>
                                    <span className="font-medium">
                                        {assignments[selectedAssignment].score}/{assignments[selectedAssignment].total_marks}
                                        ({assignments[selectedAssignment].percentage}%)
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Accuracy:</span>
                                    <span className="font-medium">
                                        {assignments[selectedAssignment].accuracy_percentage || 'N/A'}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Time Spent:</span>
                                    <span className="font-medium">
                                        {formatTime(assignments[selectedAssignment].time_taken_minutes)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Avg Time per Question:</span>
                                    <span className="font-medium">
                                        {assignments[selectedAssignment].avg_time_per_question?.toFixed(1) || 'N/A'} seconds
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Submission Details</h5>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Module:</span>
                                    <span className="font-medium">{assignments[selectedAssignment].module_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Submitted:</span>
                                    <span className="font-medium">
                                        {format(new Date(assignments[selectedAssignment].submitted_at), 'MMM dd, yyyy hh:mm a')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Status:</span>
                                    <span className={`font-medium ${assignments[selectedAssignment].result_status === 'passed'
                                            ? 'text-green-600'
                                            : 'text-red-600'
                                        }`}>
                                        {assignments[selectedAssignment].result_status.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {assignments.length === 0 && (
                <div className="p-8 text-center">
                    <div className="text-gray-400 text-4xl mb-3">📝</div>
                    <p className="text-gray-600">No assignment data available</p>
                    <p className="text-sm text-gray-500 mt-1">
                        Complete assignments to see analysis here
                    </p>
                </div>
            )}
        </div>
    );
}