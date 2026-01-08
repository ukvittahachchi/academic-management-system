'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';

interface WeakArea {
    weak_area_id: number;
    area_type: 'concept' | 'skill' | 'assignment_type' | 'time_management';
    area_name: string;
    difficulty_score: number;
    occurrences: number;
    first_identified: string;
    last_occurrence: string;
    improvement_status: 'identified' | 'improving' | 'resolved';
    notes: string;
    module_name: string;
    unit_name: string;
    content_title: string;
    days_since_last_occurrence: number;
}

interface WeakAreasProps {
    weakAreas: WeakArea[];
    studentName: string;
    isTeacher?: boolean;
    onStatusUpdate?: (weakAreaId: number, status: string, notes: string) => Promise<void>;
}

export default function WeakAreas({
    weakAreas,
    studentName,
    isTeacher = false,
    onStatusUpdate
}: WeakAreasProps) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [statusNotes, setStatusNotes] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');

    const getAreaTypeColor = (type: string) => {
        switch (type) {
            case 'concept': return 'bg-blue-100 text-blue-800';
            case 'skill': return 'bg-green-100 text-green-800';
            case 'assignment_type': return 'bg-purple-100 text-purple-800';
            case 'time_management': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getDifficultyColor = (score: number) => {
        if (score >= 4) return 'text-red-600';
        if (score >= 3) return 'text-orange-600';
        return 'text-yellow-600';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'identified': return 'bg-yellow-100 text-yellow-800';
            case 'improving': return 'bg-blue-100 text-blue-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleStatusUpdate = async (weakAreaId: number) => {
        if (onStatusUpdate && selectedStatus) {
            await onStatusUpdate(weakAreaId, selectedStatus, statusNotes);
            setEditingId(null);
            setStatusNotes('');
            setSelectedStatus('');
        }
    };

    const activeAreas = weakAreas.filter(area => area.improvement_status !== 'resolved');
    const resolvedAreas = weakAreas.filter(area => area.improvement_status === 'resolved');

    return (
        <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Weak Areas Analysis</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            {studentName}'s areas needing improvement
                        </p>
                    </div>
                    <div className="text-sm text-gray-500">
                        {activeAreas.length} active • {resolvedAreas.length} resolved
                    </div>
                </div>
            </div>

            {/* Active Weak Areas */}
            <div className="p-6">
                <h4 className="font-medium text-gray-900 mb-4">Active Weak Areas</h4>

                {activeAreas.length === 0 ? (
                    <div className="text-center py-6 bg-green-50 rounded-lg">
                        <div className="text-green-400 text-3xl mb-2">✅</div>
                        <p className="text-green-800 font-medium">No active weak areas!</p>
                        <p className="text-green-600 text-sm">Great job on continuous improvement</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeAreas.map((area) => (
                            <div key={area.weak_area_id} className="border border-gray-200 rounded-lg p-4 hover:border-red-200 hover:bg-red-50 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getAreaTypeColor(area.area_type)}`}>
                                                {area.area_type.replace('_', ' ')}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(area.improvement_status)}`}>
                                                {area.improvement_status}
                                            </span>
                                        </div>
                                        <h5 className="font-semibold text-gray-900">{area.area_name}</h5>
                                        <div className="text-sm text-gray-600 mt-1">
                                            {area.module_name} {area.unit_name && `• ${area.unit_name}`}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className={`text-lg font-bold ${getDifficultyColor(area.difficulty_score)}`}>
                                            Difficulty: {area.difficulty_score}/5
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Occurred {area.occurrences} time{area.occurrences !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                                    <div>
                                        <span className="text-gray-500">First identified:</span>
                                        <span className="ml-2 font-medium">
                                            {format(new Date(area.first_identified), 'MMM dd, yyyy')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Last occurrence:</span>
                                        <span className="ml-2 font-medium">
                                            {format(new Date(area.last_occurrence), 'MMM dd, yyyy')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Days since last:</span>
                                        <span className="ml-2 font-medium">
                                            {area.days_since_last_occurrence} days
                                        </span>
                                    </div>
                                </div>

                                {area.notes && (
                                    <div className="bg-gray-50 p-3 rounded mb-3">
                                        <p className="text-sm text-gray-700">{area.notes}</p>
                                    </div>
                                )}

                                {isTeacher && (
                                    <div className="border-t pt-3">
                                        {editingId === area.weak_area_id ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Update Status
                                                    </label>
                                                    <select
                                                        value={selectedStatus}
                                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                    >
                                                        <option value="">Select status</option>
                                                        <option value="identified">Identified</option>
                                                        <option value="improving">Improving</option>
                                                        <option value="resolved">Resolved</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Notes (Optional)
                                                    </label>
                                                    <textarea
                                                        value={statusNotes}
                                                        onChange={(e) => setStatusNotes(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                        rows={2}
                                                        placeholder="Add notes about progress..."
                                                    />
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleStatusUpdate(area.weak_area_id)}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                                    >
                                                        Update
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(null);
                                                            setStatusNotes('');
                                                            setSelectedStatus('');
                                                        }}
                                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setEditingId(area.weak_area_id)}
                                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                                            >
                                                Update Progress
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Resolved Weak Areas */}
                {resolvedAreas.length > 0 && (
                    <div className="mt-8">
                        <h4 className="font-medium text-gray-900 mb-4">Resolved Weak Areas</h4>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <span className="text-green-800 font-medium">
                                        ✅ {resolvedAreas.length} area{resolvedAreas.length !== 1 ? 's' : ''} resolved
                                    </span>
                                    <p className="text-green-600 text-sm mt-1">
                                        These areas have been successfully improved
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        // Show all resolved areas
                                        const element = document.getElementById('resolved-areas');
                                        if (element) {
                                            element.classList.toggle('hidden');
                                        }
                                    }}
                                    className="text-green-700 hover:text-green-800 text-sm"
                                >
                                    Show Details
                                </button>
                            </div>

                            <div id="resolved-areas" className="hidden space-y-2">
                                {resolvedAreas.map((area) => (
                                    <div key={area.weak_area_id} className="bg-white p-3 rounded border">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">{area.area_name}</span>
                                            <span className="text-sm text-gray-500">
                                                Resolved {format(new Date(area.last_occurrence), 'MMM dd')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {weakAreas.length === 0 && (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-3">🎯</div>
                        <p className="text-gray-600">No weak areas identified</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Weak areas will be identified based on performance patterns
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}