'use client';

import React, { useState } from 'react';
import { format, subDays } from 'date-fns';

interface FilterPanelProps {
    filters: {
        module_id?: number;
        class_section?: string;
        start_date?: string;
        end_date?: string;
        status?: string;
        [key: string]: any;
    };
    availableModules: Array<{ id: number; name: string }>;
    availableSections: string[];
    onFilterChange: (filters: any) => void;
    onReset?: () => void;
}

export default function FilterPanel({
    filters,
    availableModules,
    availableSections,
    onFilterChange,
    onReset
}: FilterPanelProps) {
    const [localFilters, setLocalFilters] = useState(filters);

    const handleFilterChange = (key: string, value: any) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleApply = () => {
        onFilterChange(localFilters);
    };

    const handleReset = () => {
        const resetFilters = {};
        setLocalFilters(resetFilters);
        onFilterChange(resetFilters);
        if (onReset) onReset();
    };

    const quickDateRanges = [
        { label: 'Today', start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') },
        { label: 'Last 7 Days', start: format(subDays(new Date(), 6), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') },
        { label: 'Last 30 Days', start: format(subDays(new Date(), 29), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') },
        { label: 'This Month', start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <button
                    onClick={handleReset}
                    className="text-sm text-blue-600 hover:text-blue-800"
                >
                    Reset All
                </button>
            </div>

            <div className="space-y-6">
                {/* Module Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Module
                    </label>
                    <select
                        value={localFilters.module_id || ''}
                        onChange={(e) => handleFilterChange('module_id', e.target.value || undefined)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Modules</option>
                        {availableModules.map(module => (
                            <option key={module.id} value={module.id}>
                                {module.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Class Section Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Class Section
                    </label>
                    <select
                        value={localFilters.class_section || ''}
                        onChange={(e) => handleFilterChange('class_section', e.target.value || undefined)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Sections</option>
                        {availableSections.map(section => (
                            <option key={section} value={section}>
                                {section}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Quick Date Range Buttons */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quick Date Ranges
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {quickDateRanges.map(range => (
                            <button
                                key={range.label}
                                onClick={() => {
                                    handleFilterChange('start_date', range.start);
                                    handleFilterChange('end_date', range.end);
                                }}
                                className={`px-3 py-2 text-sm rounded-lg border ${localFilters.start_date === range.start
                                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date Range Picker */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={localFilters.start_date || ''}
                            onChange={(e) => handleFilterChange('start_date', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={localFilters.end_date || ''}
                            onChange={(e) => handleFilterChange('end_date', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Status Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student Status
                    </label>
                    <div className="flex space-x-4">
                        {[
                            { value: 'all', label: 'All', color: 'bg-gray-100' },
                            { value: 'active', label: 'Active', color: 'bg-green-100' },
                            { value: 'inactive', label: 'Inactive', color: 'bg-red-100' },
                            { value: 'top_performers', label: 'Top Performers', color: 'bg-blue-100' },
                            { value: 'needs_attention', label: 'Needs Attention', color: 'bg-yellow-100' }
                        ].map(status => (
                            <button
                                key={status.value}
                                onClick={() => handleFilterChange('status', status.value === 'all' ? undefined : status.value)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${localFilters.status === status.value || (!localFilters.status && status.value === 'all')
                                    ? `${status.color} border-2 border-gray-300`
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {status.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Apply Button */}
                <button
                    onClick={handleApply}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
                >
                    Apply Filters
                </button>
            </div>
        </div>
    );
}