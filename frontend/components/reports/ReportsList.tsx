'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { ReportData } from '@/lib/types/report';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import {
    Download,
    Trash2,
    FileSpreadsheet,
    Calendar,
    User,
    Clock,
    MoreVertical,
    Eye,
    Filter
} from 'lucide-react';

interface ReportsListProps {
    refreshTrigger?: number;
}

const ReportsList: React.FC<ReportsListProps> = ({ refreshTrigger }) => {
    const { user } = useAuth();
    const [reports, setReports] = useState<ReportData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const loadReports = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiClient.getReports(page, 10);
            setReports(response.data);
            setTotalPages(response.pagination.pages);
        } catch (error: any) {
            setError(error.message || 'Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, [page, refreshTrigger]);

    const handleDownload = async (reportId: number) => {
        try {
            await apiClient.downloadReport(reportId);
            // Refresh list to update download count
            loadReports();
        } catch (error: any) {
            setError(error.message || 'Failed to download report');
        }
    };

    const handleDelete = async (reportId: number) => {
        if (!confirm('Are you sure you want to delete this report?')) {
            return;
        }

        try {
            setDeletingId(reportId);
            await apiClient.deleteReport(reportId);
            setReports(reports.filter(r => r.report_id !== reportId));
        } catch (error: any) {
            setError(error.message || 'Failed to delete report');
        } finally {
            setDeletingId(null);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleString();
    };

    const getReportTypeColor = (type: string): string => {
        const colors: Record<string, string> = {
            student_performance: 'bg-blue-100 text-blue-800',
            class_summary: 'bg-green-100 text-green-800',
            system_usage: 'bg-purple-100 text-purple-800',
            module_analytics: 'bg-amber-100 text-amber-800'
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };

    const getReportTypeLabel = (type: string): string => {
        const labels: Record<string, string> = {
            student_performance: 'Student Performance',
            class_summary: 'Class Summary',
            system_usage: 'System Usage',
            module_analytics: 'Module Analytics'
        };
        return labels[type] || type;
    };

    if (loading && reports.length === 0) {
        return <LoadingSpinner />;
    }

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5" />
                            Generated Reports
                        </h2>
                        <p className="text-gray-600 text-sm mt-1">
                            View and manage all generated reports
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                        <Filter className="h-4 w-4" />
                        <span className="text-sm">
                            {reports.length} reports
                        </span>
                    </div>
                </div>
            </div>

            <div className="mx-6 mt-4">
                <ErrorMessage error={error} onClose={() => setError(null)} />
            </div>

            {reports.length === 0 ? (
                <div className="p-12 text-center">
                    <FileSpreadsheet className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                        No reports generated yet
                    </h3>
                    <p className="text-gray-500">
                        Generate your first report to see it here
                    </p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Report Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Generated By
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        File Info
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reports.map((report) => (
                                    <tr key={report.report_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getReportTypeColor(report.report_type)}`}>
                                                        {getReportTypeLabel(report.report_type)}
                                                    </span>
                                                </div>
                                                <div className="font-medium text-gray-900">
                                                    {report.report_name}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                    <Download className="h-3 w-3" />
                                                    <span>{report.download_count} downloads</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-gray-400" />
                                                <span className="text-gray-700">
                                                    {report.generated_by_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <div className="font-medium text-gray-900">
                                                    {formatFileSize(report.file_size_bytes)}
                                                </div>
                                                <div className="text-gray-500">
                                                    Excel file
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                <span title={formatDate(report.created_at)}>
                                                    {new Date(report.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {new Date(report.created_at).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleDownload(report.report_id)}
                                                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="Download report"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>

                                                {(user?.role === 'admin' || user?.id === report.generated_by) && (
                                                    <button
                                                        onClick={() => handleDelete(report.report_id)}
                                                        disabled={deletingId === report.report_id}
                                                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                                        title="Delete report"
                                                    >
                                                        {deletingId === report.report_id ? (
                                                            <LoadingSpinner size="small" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    Page <span className="font-medium">{page}</span> of{' '}
                                    <span className="font-medium">{totalPages}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ReportsList;