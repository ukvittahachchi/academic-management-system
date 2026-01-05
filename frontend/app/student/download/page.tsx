'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { DownloadableContent } from '@/lib/types/content';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

export default function DownloadsPage() {
    const [downloads, setDownloads] = useState<DownloadableContent[]>([]);
    const [filteredDownloads, setFilteredDownloads] = useState<DownloadableContent[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('all');
    const [downloading, setDownloading] = useState<number | null>(null);

    useEffect(() => {
        loadDownloads();
    }, []);

    useEffect(() => {
        filterDownloads();
    }, [searchTerm, filterType, downloads]);

    const loadDownloads = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getDownloadableContent();
            setDownloads(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load downloads');
        } finally {
            setLoading(false);
        }
    };

    const filterDownloads = () => {
        let filtered = [...downloads];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(item =>
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.module_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (item.unit_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );
        }

        // Type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(item => item.part_type === filterType);
        }

        setFilteredDownloads(filtered);
    };

    const handleDownload = async (content: DownloadableContent) => {
        try {
            setDownloading(content.part_id);
            const downloadData = await apiClient.getDownloadUrl(content.part_id);

            const link = document.createElement('a');
            link.href = downloadData.download_url;
            link.download = downloadData.file_name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => setDownloading(null), 1000);
        } catch (err: any) {
            alert(`Download failed: ${err.message}`);
            setDownloading(null);
        }
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('video')) return '🎬';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊';
        if (mimeType.includes('word')) return '📝';
        return '📎';
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <ErrorMessage error={error} onRetry={loadDownloads} />
            </div>
        );
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">My Downloads</h1>
                                <p className="text-gray-600 mt-2">
                                    Download learning materials for offline access
                                </p>
                            </div>
                            <div className="text-sm text-gray-500">
                                {downloads.length} items available
                            </div>
                        </div>
                    </div>
                </header>

                {/* Filters */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                            {/* Search */}
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Search downloads by title, module, or unit..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Type Filter */}
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setFilterType('all')}
                                    className={`px-4 py-2 rounded-lg ${filterType === 'all'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilterType('reading')}
                                    className={`px-4 py-2 rounded-lg ${filterType === 'reading'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Readings
                                </button>
                                <button
                                    onClick={() => setFilterType('video')}
                                    className={`px-4 py-2 rounded-lg ${filterType === 'video'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Videos
                                </button>
                                <button
                                    onClick={() => setFilterType('presentation')}
                                    className={`px-4 py-2 rounded-lg ${filterType === 'presentation'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Presentations
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Downloads Grid */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        {filteredDownloads.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="text-gray-400 text-6xl mb-4">📁</div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No downloads found
                                </h3>
                                <p className="text-gray-500">
                                    {searchTerm || filterType !== 'all'
                                        ? 'Try changing your search or filter'
                                        : 'No downloadable content available yet'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {filteredDownloads.map((item) => (
                                    <div
                                        key={item.part_id}
                                        className="p-6 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-4">
                                                <div className="text-3xl">
                                                    {getFileIcon(item.mime_type)}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-gray-900">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        <span className="font-medium">{item.module_name}</span>
                                                        <span className="mx-2">•</span>
                                                        <span>{item.unit_name}</span>
                                                        <span className="mx-2">•</span>
                                                        <span className="capitalize">{item.part_type}</span>
                                                    </p>
                                                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                                        <span>Size: {formatFileSize(item.file_size_bytes)}</span>
                                                        <span>Type: {item.content_type}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDownload(item)}
                                                disabled={downloading === item.part_id}
                                                className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${downloading === item.part_id
                                                    ? 'bg-blue-400 text-white'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                    }`}
                                            >
                                                {downloading === item.part_id ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                        <span>Downloading...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>📥</span>
                                                        <span>Download</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="text-2xl font-bold text-blue-600">{downloads.length}</div>
                            <div className="text-sm text-gray-500">Total Files</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="text-2xl font-bold text-green-600">
                                {downloads.filter(d => d.part_type === 'reading').length}
                            </div>
                            <div className="text-sm text-gray-500">Readings</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="text-2xl font-bold text-purple-600">
                                {downloads.filter(d => d.part_type === 'video').length}
                            </div>
                            <div className="text-sm text-gray-500">Videos</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="text-2xl font-bold text-orange-600">
                                {downloads.filter(d => d.part_type === 'presentation').length}
                            </div>
                            <div className="text-sm text-gray-500">Presentations</div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}