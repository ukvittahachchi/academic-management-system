'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { DownloadableContent } from '@/lib/types/content';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { LuFileText, LuVideo, LuMonitorPlay, LuPaperclip, LuFolder, LuDownload, LuSearch, LuDatabase } from "react-icons/lu";
import StudentButton from '@/components/ui/StudentButton';
import StudentCard from '@/components/ui/StudentCard';

export default function ClientDownloads() {
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

        if (searchTerm) {
            filtered = filtered.filter(item =>
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.module_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (item.unit_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );
        }

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
        if (mimeType.includes('pdf')) return <LuFileText className="w-6 h-6" />;
        if (mimeType.includes('video')) return <LuVideo className="w-6 h-6" />;
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <LuMonitorPlay className="w-6 h-6" />;
        if (mimeType.includes('word')) return <LuFileText className="w-6 h-6" />;
        return <LuPaperclip className="w-6 h-6" />;
    };

    const getFileColor = (mimeType: string) => {
        if (mimeType.includes('pdf')) return 'text-red-500 bg-red-50';
        if (mimeType.includes('video')) return 'text-blue-500 bg-blue-50';
        if (mimeType.includes('presentation')) return 'text-orange-500 bg-orange-50';
        return 'text-gray-500 bg-gray-50';
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
            <div className="flex items-center justify-center h-screen bg-gray-50/50">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-gray-50/50 min-h-screen">
                <ErrorMessage error={error} onRetry={loadDownloads} />
            </div>
        );
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50/50 pb-20">
                {/* Premium Header Section */}
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-brand-500 pb-32 relative overflow-hidden shadow-2xl shadow-indigo-500/20 isolate text-white rounded-b-[3rem]">
                    {/* Abstract Shapes */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-brand-400/20 rounded-full blur-2xl opacity-50 pointer-events-none"></div>

                    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-black text-white flex items-center gap-4 mb-3 tracking-tight">
                                    <span className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg"><LuDownload className="w-8 h-8" /></span>
                                    My Downloads
                                </h1>
                                <p className="text-indigo-100 text-lg font-medium max-w-xl leading-relaxed">
                                    Access your learning materials offline, anytime.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl font-black text-white border border-white/10 shadow-lg flex flex-col items-center min-w-[120px]">
                                    <span className="text-3xl">{downloads.length}</span>
                                    <span className="text-xs uppercase tracking-widest text-indigo-200">Files</span>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl font-black text-white border border-white/10 shadow-lg flex flex-col items-center min-w-[120px]">
                                    <span className="text-3xl">{formatFileSize(downloads.reduce((acc, curr) => acc + curr.file_size_bytes, 0))}</span>
                                    <span className="text-xs uppercase tracking-widest text-indigo-200">Total Size</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-20 relative z-20 mb-8">
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-4 shadow-xl border border-white/20">
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="relative flex-1 w-full group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="text-gray-400 group-focus-within:text-indigo-500 transition-colors"><LuSearch /></span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search downloads..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all font-medium placeholder-gray-400"
                                />
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto px-1">
                                {[
                                    { id: 'all', label: 'All Files' },
                                    { id: 'reading', label: 'Readings' },
                                    { id: 'video', label: 'Videos' },
                                    { id: 'presentation', label: 'Slides' }
                                ].map((tab: any) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setFilterType(tab.id)}
                                        className={`px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${filterType === tab.id
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-600 ring-offset-2'
                                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Downloads Grid */}
                <main className="max-w-7xl mx-auto px-4 md:px-6 animate-[fade-in_0.5s_ease-out]">
                    {filteredDownloads.length === 0 ? (
                        <div className="text-center py-20 bg-white/50 rounded-[3rem] border border-dashed border-gray-200">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400 text-5xl">
                                <LuFolder />
                            </div>
                            <h3 className="text-2xl font-black text-gray-800 mb-2">No downloads found</h3>
                            <p className="text-gray-500 font-medium">Try adjusting your filters or check back later!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredDownloads.map((item) => (
                                <StudentCard key={item.part_id} className="flex flex-col h-full group hover:shadow-xl transition-all duration-300">
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-3 rounded-2xl ${getFileColor(item.mime_type)}`}>
                                                {getFileIcon(item.mime_type)}
                                            </div>
                                            <div className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                                                {formatFileSize(item.file_size_bytes)}
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-indigo-600 transition-colors">
                                            {item.title}
                                        </h3>

                                        <div className="space-y-1 mb-6">
                                            <p className="text-sm text-gray-500 font-medium">
                                                <span className="text-gray-400 text-xs uppercase tracking-wide">Module</span><br />
                                                {item.module_name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-auto p-4 bg-gray-50 border-t border-gray-100">
                                        <StudentButton
                                            onClick={() => handleDownload(item)}
                                            disabled={downloading === item.part_id}
                                            className="w-full justify-center font-bold"
                                            variant="primary"
                                        >
                                            {downloading === item.part_id ? (
                                                <>
                                                    <LoadingSpinner size="small" color="white" /> Downloading
                                                </>
                                            ) : (
                                                <>
                                                    <LuDownload className="w-4 h-4 mr-2" /> Download
                                                </>
                                            )}
                                        </StudentButton>
                                    </div>
                                </StudentCard>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </ProtectedRoute>
    );
}
