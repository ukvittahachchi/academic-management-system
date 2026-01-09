'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { AuditLog } from '@/lib/types/admin';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

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

    useEffect(() => {
        fetchLogs();
    }, [page]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const formatActivity = (type: string) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Audit Logs</h1>
                <p className="text-gray-500">View system activity and security events</p>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading logs...</div>
                ) : error ? (
                    <div className="p-8 text-center text-red-500">{error}</div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No logs found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600">Timestamp</th>
                                    <th className="p-4 font-semibold text-gray-600">User</th>
                                    <th className="p-4 font-semibold text-gray-600">Activity</th>
                                    <th className="p-4 font-semibold text-gray-600">Details</th>
                                    <th className="p-4 font-semibold text-gray-600">IP Address</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {logs.map((log) => (
                                    <tr key={log.log_id} className="hover:bg-gray-50">
                                        <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                                            {formatDate(log.created_at)}
                                        </td>
                                        <td className="p-4">
                                            {log.username ? (
                                                <>
                                                    <div className="font-medium text-gray-900">{log.full_name || log.username}</div>
                                                    <div className="text-xs text-gray-500">@{log.username} ({log.role})</div>
                                                </>
                                            ) : (
                                                <span className="text-gray-400">Unknown User</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold
                        ${log.activity_type.includes('login') ? 'bg-green-100 text-green-700' :
                                                    log.activity_type.includes('fail') || log.activity_type.includes('lock') ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'}
                      `}>
                                                {formatActivity(log.activity_type)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={String(log.details)}>
                                            {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 font-mono">
                                            {log.ip_address}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t flex justify-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-gray-600">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
