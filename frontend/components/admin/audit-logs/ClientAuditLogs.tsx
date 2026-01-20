'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { AuditLog } from '@/lib/types/admin';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import {
    LuActivity,
    LuSearch,
    LuFilter,
    LuCalendar,
    LuUser,

    LuServer,
    LuShieldAlert
} from 'react-icons/lu';

export default function ClientAuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchLogs();
    }, [page]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await apiClient.getAuditLogs(page, 20);
            setLogs(response.logs);
            setTotalPages(response.pagination.pages);
            setLoading(false);
        } catch (err: any) {
            setError(err.message || 'Failed to load logs');
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    };

    const formatActivity = (type: string) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const getActivityIcon = (type: string) => {
        if (type.includes('login')) return <LuUser className="w-4 h-4" />;
        if (type.includes('delete')) return <LuShieldAlert className="w-4 h-4" />;
        if (type.includes('update')) return <LuActivity className="w-4 h-4" />;
        if (type.includes('create')) return <LuActivity className="w-4 h-4" />;
        return <LuServer className="w-4 h-4" />;
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 glass-effect">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <span className="bg-amber-500 text-white p-2 rounded-lg">
                                    <LuShieldAlert className="w-5 h-5" />
                                </span>
                                Audit Logs
                            </h1>
                            <p className="text-gray-500 text-sm mt-1 ml-11">Monitor system security and activity</p>
                        </div>
                    </div>

                    {/* Filters Toolbar */}
                    <div className="mt-6 flex gap-4">
                        <div className="relative flex-1">
                            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search logs (coming soon)..."
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                                disabled
                            />
                        </div>
                        <div className="relative w-48">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <LuCalendar className="text-gray-400 w-5 h-5" />
                            </div>
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <LoadingSpinner />
                    </div>
                ) : error ? (
                    <ErrorMessage error={error} onRetry={fetchLogs} />
                ) : logs.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-gray-100">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <LuActivity className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No activity found</h3>
                        <p className="text-gray-500">The audit log is empty</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-6 font-bold text-gray-500 text-xs uppercase tracking-wider">Time & User</th>
                                        <th className="p-6 font-bold text-gray-500 text-xs uppercase tracking-wider">Activity Type</th>
                                        <th className="p-6 font-bold text-gray-500 text-xs uppercase tracking-wider">Details</th>
                                        <th className="p-6 font-bold text-gray-500 text-xs uppercase tracking-wider">IP Source</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {logs.map((log) => (
                                        <tr key={log.log_id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs uppercase">
                                                        {log.username ? log.username.substring(0, 2) : '??'}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">
                                                            {formatDate(log.created_at)}
                                                        </div>
                                                        <div className="text-xs text-gray-500 font-medium">
                                                            {log.full_name || log.username || 'Unknown User'}
                                                            <span className="mx-1">•</span>
                                                            <span className="uppercase text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{log.role || 'System'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border
                                                    ${log.activity_type.includes('login') ? 'bg-green-50 text-green-700 border-green-100' :
                                                        log.activity_type.includes('fail') || log.activity_type.includes('delete') ? 'bg-red-50 text-red-700 border-red-100' :
                                                            'bg-blue-50 text-blue-700 border-blue-100'}
                                                `}>
                                                    {getActivityIcon(log.activity_type)}
                                                    {formatActivity(log.activity_type)}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="max-w-md text-sm text-gray-600 truncate font-medium" title={typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)}>
                                                    {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2 text-sm text-gray-500 font-mono">
                                                    <LuServer className="w-3 h-3 text-gray-300" />
                                                    {log.ip_address}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50/30">
                                <span className="text-sm text-gray-500 font-medium">
                                    Page {page} of {totalPages}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(p => p - 1)}
                                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
