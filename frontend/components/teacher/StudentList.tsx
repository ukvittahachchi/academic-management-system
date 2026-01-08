'use client';

import React, { useState } from 'react';
import { TeacherStudent } from '@/lib/types/teacher';
import { format } from 'date-fns';

interface StudentListProps {
    students: TeacherStudent[];
    onStudentClick?: (student: TeacherStudent) => void;
    showFilters?: boolean;
    onFilterChange?: (filters: any) => void;
}

export default function StudentList({
    students,
    onStudentClick,
    showFilters = true,
    onFilterChange
}: StudentListProps) {
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        sortBy: 'name',
        sortOrder: 'asc'
    });

    const handleFilterChange = (key: string, value: any) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        if (onFilterChange) {
            onFilterChange(newFilters);
        }
    };

    const filteredStudents = students.filter(student => {
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            return (
                student.full_name.toLowerCase().includes(searchTerm) ||
                student.username.toLowerCase().includes(searchTerm) ||
                student.roll_number.toLowerCase().includes(searchTerm)
            );
        }
        return true;
    }).sort((a, b) => {
        const multiplier = filters.sortOrder === 'asc' ? 1 : -1;

        switch (filters.sortBy) {
            case 'name':
                return multiplier * a.full_name.localeCompare(b.full_name);
            case 'score':
                return multiplier * ((a.avg_score || 0) - (b.avg_score || 0));
            case 'progress':
                return multiplier * (a.completion_percentage - b.completion_percentage);
            case 'activity':
                const dateA = a.last_activity_date ? new Date(a.last_activity_date).getTime() : 0;
                const dateB = b.last_activity_date ? new Date(b.last_activity_date).getTime() : 0;
                return multiplier * (dateA - dateB);
            default:
                return 0;
        }
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800';
            case 'not_started':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getScoreColor = (score: number | null) => {
        if (score === null) return 'text-gray-500';
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const formatLastActivity = (date: string | null) => {
        if (!date) return 'Never';

        const activityDate = new Date(date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return format(activityDate, 'MMM dd');
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border">
            {/* Header */}
            <div className="p-6 border-b">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Students</h3>
                    <span className="text-sm text-gray-500">
                        {filteredStudents.length} of {students.length} students
                    </span>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div>
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Sort By */}
                        <div>
                            <select
                                value={filters.sortBy}
                                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="name">Sort by Name</option>
                                <option value="score">Sort by Score</option>
                                <option value="progress">Sort by Progress</option>
                                <option value="activity">Sort by Activity</option>
                            </select>
                        </div>

                        {/* Sort Order */}
                        <div>
                            <select
                                value={filters.sortOrder}
                                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </select>
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={() => {
                                // Export functionality
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Export List
                        </button>
                    </div>
                )}
            </div>

            {/* Student List */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Student
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Progress
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Score
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Study Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Activity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredStudents.map((student) => (
                            <tr
                                key={student.student_id}
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => onStudentClick && onStudentClick(student)}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            {student.profile_picture_url ? (
                                                <img
                                                    src={student.profile_picture_url}
                                                    alt={student.full_name}
                                                    className="h-10 w-10 rounded-full"
                                                />
                                            ) : (
                                                <span className="text-blue-600 font-bold">
                                                    {student.full_name.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {student.full_name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {student.class_grade} • Roll: {student.roll_number}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                <td className="px-6 py-4">
                                    <div className="w-48">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>{(Number(student.completion_percentage) || 0).toFixed(1)}%</span>
                                            <span>{student.completed_parts || 0}/{student.total_parts || 0}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                                                style={{ width: `${student.completion_percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </td>

                                <td className="px-6 py-4">
                                    <span className={`text-lg font-bold ${getScoreColor(student.avg_score)}`}>
                                        {student.avg_score !== null && student.avg_score !== undefined ? Number(student.avg_score).toFixed(1) : 'N/A'}
                                    </span>
                                </td>

                                <td className="px-6 py-4 text-sm">
                                    <div className="flex items-center">
                                        <span className="text-gray-600">⏱️</span>
                                        <span className="ml-2">
                                            {Math.round(student.total_study_time_minutes)} min
                                        </span>
                                    </div>
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {formatLastActivity(student.last_activity_date)}
                                </td>

                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(student.overall_status)}`}>
                                        {student.overall_status.replace('_', ' ')}
                                    </span>
                                </td>

                                <td className="px-6 py-4">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onStudentClick && onStudentClick(student);
                                        }}
                                        className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded hover:bg-blue-100"
                                    >
                                        View Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Empty State */}
            {filteredStudents.length === 0 && (
                <div className="p-8 text-center">
                    <div className="text-gray-400 text-4xl mb-3">👨‍🎓</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                    <p className="text-gray-500">
                        {filters.search ? 'Try changing your search term' : 'No students in this class'}
                    </p>
                </div>
            )}
        </div>
    );
}