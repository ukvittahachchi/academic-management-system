'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { ReportFilter, ReportConfiguration } from '@/lib/types/report';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Module } from '@/lib/types/module';
import {
    CalendarDays,
    Download,
    FileSpreadsheet,
    Filter,
    RefreshCw,
    Clock,
    Users,
    BarChart3,
    Activity
} from 'lucide-react';

interface ReportGeneratorProps {
    onReportGenerated?: (reportId: number) => void;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ onReportGenerated }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [reportType, setReportType] = useState<string>('student_performance');
    const [configurations, setConfigurations] = useState<ReportConfiguration[]>([]);
    const [modulesList, setModulesList] = useState<Module[]>([]);

    const [filters, setFilters] = useState<ReportFilter>({
        startDate: '',
        endDate: '',
        classGrade: '',
        moduleId: undefined,
        days: 30
    });

    const reportTypes = [
        {
            id: 'student_performance',
            name: 'Student Performance',
            icon: <Users className="h-5 w-5" />,
            description: 'Detailed individual student performance',
            color: 'bg-blue-100 text-blue-800'
        },
        {
            id: 'class_summary',
            name: 'Class Summary',
            icon: <BarChart3 className="h-5 w-5" />,
            description: 'Class-level analytics and averages',
            color: 'bg-green-100 text-green-800'
        },
        {
            id: 'system_usage',
            name: 'System Usage',
            icon: <Activity className="h-5 w-5" />,
            description: 'System engagement and activity',
            color: 'bg-purple-100 text-purple-800'
        },
        {
            id: 'module_analytics',
            name: 'Module Analytics',
            icon: <FileSpreadsheet className="h-5 w-5" />,
            description: 'Module effectiveness analysis',
            color: 'bg-amber-100 text-amber-800'
        }
    ];

    useEffect(() => {
        loadConfigurations();
        loadModules();
    }, []);

    const loadConfigurations = async () => {
        try {
            setLoading(true);
            const response = await apiClient.getReportConfigurations();
            setConfigurations(response.data);
        } catch (error: any) {
            setError(error.message || 'Failed to load report configurations');
        } finally {
            setLoading(false);
        }
    };

    const loadModules = async () => {
        try {
            const response = await apiClient.getModules();
            setModulesList(response.data);
        } catch (error) {
            console.error('Failed to load modules:', error);
        }
    };

    const handleFilterChange = (key: keyof ReportFilter, value: any) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleGenerateReport = async () => {
        if (!reportType) {
            setError('Please select a report type');
            return;
        }

        try {
            setGenerating(true);
            setError(null);
            setSuccess(null);

            const response = await apiClient.generateReport({
                report_type: reportType as any,
                filters
            });

            setSuccess(`Report generated successfully! ${response.data.record_count} records processed.`);

            if (onReportGenerated) {
                onReportGenerated(response.data.report_id);
            }

            // Automatically download the report
            try {
                await apiClient.downloadReport(response.data.report_id);
            } catch (downloadError) {
                console.error('Failed to auto-download report:', downloadError);
                // Don't show error to user if generation was successful, just log it
                // The user can still download manually from the list if needed
            }

            // Reset filters
            setFilters({
                startDate: '',
                endDate: '',
                classGrade: '',
                moduleId: undefined,
                days: 30
            });
        } catch (error: any) {
            setError(error.response?.data?.message || error.message || 'Failed to generate report');
        } finally {
            setGenerating(false);
        }
    };

    const renderFilterFields = () => {
        switch (reportType) {
            case 'student_performance':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Class/Grade
                            </label>
                            <input
                                type="text"
                                value={filters.classGrade || ''}
                                onChange={(e) => handleFilterChange('classGrade', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Grade 6"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Module
                            </label>
                            <select
                                value={filters.moduleId || ''}
                                onChange={(e) => handleFilterChange('moduleId', e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Modules</option>
                                {modulesList.map(module => (
                                    <option key={module.module_id} value={module.module_id}>
                                        {module.module_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={filters.startDate || ''}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={filters.endDate || ''}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                );

            case 'class_summary':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={filters.startDate || ''}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={filters.endDate || ''}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                );

            case 'system_usage':
                return (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Days to Analyze
                        </label>
                        <select
                            value={filters.days || 30}
                            onChange={(e) => handleFilterChange('days', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={7}>Last 7 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={90}>Last 90 days</option>
                            <option value={180}>Last 6 months</option>
                            <option value={365}>Last year</option>
                        </select>
                    </div>
                );

            case 'module_analytics':
                return (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Grade Level
                        </label>
                        <input
                            type="text"
                            value={filters.gradeLevel || ''}
                            onChange={(e) => handleFilterChange('gradeLevel', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Grade 6"
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    const selectedReport = reportTypes.find(r => r.id === reportType);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                        Generate Report
                    </h2>
                    <p className="text-gray-600 mt-1">
                        Generate detailed Excel reports for analysis and record-keeping
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-500">Report Generator</span>
                </div>
            </div>

            {error && <ErrorMessage error={error} onClose={() => setError(null)} />}
            {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-2 text-green-800">
                        <FileSpreadsheet className="h-5 w-5" />
                        <span className="font-medium">{success}</span>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {/* Report Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Report Type
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {reportTypes.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setReportType(type.id)}
                                className={`p-4 rounded-lg border transition-all duration-200 ${reportType === type.id
                                    ? 'border-blue-500 ring-2 ring-blue-100'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${type.color}`}>
                                        {type.icon}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-gray-800">
                                            {type.name}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {type.description}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Report Description */}
                {selectedReport && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-1">
                                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-blue-800">
                                    {selectedReport.name} Report
                                </h3>
                                <p className="text-blue-700 text-sm mt-1">
                                    {selectedReport.description}. This report will generate an Excel file with detailed analytics.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filter Section */}
                <div className="border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="h-5 w-5 text-gray-500" />
                        <h3 className="font-semibold text-gray-700">Report Filters</h3>
                    </div>

                    {renderFilterFields()}

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            onClick={handleGenerateReport}
                            disabled={generating}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {generating ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FileSpreadsheet className="h-4 w-4" />
                                    Generate Excel Report
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => {
                                setFilters({
                                    startDate: '',
                                    endDate: '',
                                    classGrade: '',
                                    moduleId: undefined,
                                    days: 30
                                });
                            }}
                            className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                            Clear Filters
                        </button>
                    </div>

                    {generating && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-md">
                            <div className="flex items-center gap-3">
                                <LoadingSpinner size="small" />
                                <div>
                                    <div className="font-medium text-blue-800">
                                        Generating your report...
                                    </div>
                                    <div className="text-sm text-blue-700">
                                        This may take a moment depending on data size.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Tips */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Quick Tips
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>• For large datasets, use date filters to limit results</li>
                        <li>• Generated reports are saved and can be downloaded later</li>
                        <li>• Excel files include formulas and conditional formatting</li>
                        <li>• Teachers can only access reports they generated</li>
                        <li>• Reports older than 30 days are automatically cleaned up</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ReportGenerator;