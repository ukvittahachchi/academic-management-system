'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const PDFViewer = dynamic(() => import('@/components/content/PDFViewer'), {
    ssr: false,
    loading: () => <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
});
import VideoViewer from '@/components/content/VideoViewer';
const PresentationViewer = dynamic(() => import('@/components/content/PresentationViewer'), {
    ssr: false,
    loading: () => <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
});
import AssignmentViewer from '@/components/content/AssignmentViewer';
import { apiClient } from '@/lib/api-client';
import { ContentResponse } from '@/lib/types/content';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

export default function LearnContentPage() {
    const params = useParams();
    const router = useRouter();
    const partId = parseInt(params.partId as string);

    const [contentData, setContentData] = useState<ContentResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isCompleting, setIsCompleting] = useState<boolean>(false);

    useEffect(() => {
        loadContent();
    }, [partId]);

    const loadContent = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await apiClient.getContentDetails(partId);
            setContentData(data);
        } catch (err: any) {
            console.error('Failed to load content:', err);
            setError(err.message || 'Failed to load content');
        } finally {
            setLoading(false);
        }
    };

    const handleTimeUpdate = async (timeSpent: number) => {
        try {
            await apiClient.updateAccessTime(partId, timeSpent);
        } catch (err) {
            console.error('Failed to update access time:', err);
        }
    };

    const handleMarkComplete = async () => {
        try {
            setIsCompleting(true);
            await apiClient.markAsCompleted(partId);

            // Update local state
            if (contentData) {
                setContentData({
                    ...contentData,
                    progress: {
                        ...contentData.progress!,
                        status: 'completed',
                        completed_at: new Date().toISOString()
                    }
                });
            }
        } catch (err: any) {
            console.error('Failed to mark as complete:', err);
            alert(`Failed to complete: ${err.message}`);
        } finally {
            setIsCompleting(false);
        }
    };

    const handleDownload = async () => {
        try {
            const downloadData = await apiClient.getDownloadUrl(partId);

            // Create download link
            const link = document.createElement('a');
            link.href = downloadData.download_url;
            link.download = downloadData.file_name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err: any) {
            console.error('Download failed:', err);
            alert(`Download failed: ${err.message}`);
        }
    };

    const renderViewer = () => {
        if (!contentData) return null;

        const { content } = contentData;
        const commonProps = {
            content,
            onTimeUpdate: handleTimeUpdate,
            onComplete: handleMarkComplete
        };

        switch (content.part_type) {
            case 'reading':
                return <PDFViewer {...commonProps} />;

            case 'video':
                return <VideoViewer {...commonProps} />;

            case 'presentation':
                return <PresentationViewer {...commonProps} />;

            case 'assignment':
                return <AssignmentViewer {...commonProps} />;

            default:
                return (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">Unsupported content type: {content.part_type}</p>
                    </div>
                );
        }
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
                <ErrorMessage error={error} onRetry={loadContent} />
            </div>
        );
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {contentData?.content.title}
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    {(contentData?.content?.part_type?.charAt(0).toUpperCase() || '') + (contentData?.content?.part_type?.slice(1) || '')}
                                </p>
                            </div>

                            <div className="flex items-center space-x-4">
                                {/* Progress Indicator */}
                                {contentData?.progress && (
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-600">
                                            Status:
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${contentData.progress.status === 'completed'
                                            ? 'bg-green-100 text-green-800'
                                            : contentData.progress.status === 'in_progress'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {contentData.progress.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center space-x-2">
                                    {contentData?.content.is_downloadable && (
                                        <button
                                            onClick={handleDownload}
                                            disabled={isCompleting}
                                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                                        >
                                            <span>📥</span>
                                            <span>Download</span>
                                        </button>
                                    )}

                                    {contentData?.progress?.status !== 'completed' && (
                                        <button
                                            onClick={handleMarkComplete}
                                            disabled={isCompleting}
                                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                                        >
                                            {isCompleting ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    <span>Completing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>✓</span>
                                                    <span>Mark Complete</span>
                                                </>
                                            )}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => router.back()}
                                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                                    >
                                        ← Back
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        {contentData?.progress && contentData.content.pages_count && (
                            <div className="mt-4">
                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>Progress</span>
                                    <span>
                                        {contentData.progress.time_spent_seconds
                                            ? `${Math.floor(contentData.progress.time_spent_seconds / 60)}m spent`
                                            : 'Not started'
                                        }
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all"
                                        style={{
                                            width: contentData.progress.status === 'completed'
                                                ? '100%'
                                                : contentData.progress.status === 'in_progress'
                                                    ? '50%'
                                                    : '0%'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="h-[calc(100vh-250px)]">
                            {renderViewer()}
                        </div>
                    </div>

                    {/* Content Info */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left Column - Content Details */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="font-semibold text-lg mb-4">Content Details</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Type:</span>
                                    <span className="font-medium">{contentData?.content.part_type}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Format:</span>
                                    <span className="font-medium">{contentData?.content.content_type}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Size:</span>
                                    <span className="font-medium">
                                        {contentData?.content?.file_size_bytes
                                            ? `${(contentData.content.file_size_bytes / 1024 / 1024).toFixed(2)} MB`
                                            : 'N/A'
                                        }
                                    </span>
                                </div>
                                {contentData?.content.video_duration && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Duration:</span>
                                        <span className="font-medium">
                                            {Math.floor(contentData.content.video_duration / 60)}:
                                            {(contentData.content.video_duration % 60).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                )}
                                {contentData?.content.pages_count && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Pages:</span>
                                        <span className="font-medium">{contentData.content.pages_count}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Middle Column - Learning Objectives */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="font-semibold text-lg mb-4">Learning Tips</h3>
                            <ul className="space-y-2">
                                {contentData?.content.part_type === 'reading' && (
                                    <>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">✓</span>
                                            <span>Read carefully and take notes</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">✓</span>
                                            <span>Use the zoom feature for better readability</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">✓</span>
                                            <span>Download for offline reading if needed</span>
                                        </li>
                                    </>
                                )}
                                {contentData?.content.part_type === 'video' && (
                                    <>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">✓</span>
                                            <span>Adjust playback speed according to your comfort</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">✓</span>
                                            <span>Take notes during important sections</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">✓</span>
                                            <span>Rewatch difficult parts if needed</span>
                                        </li>
                                    </>
                                )}
                                {contentData?.content.part_type === 'presentation' && (
                                    <>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">✓</span>
                                            <span>Use fullscreen mode (Press F) for better view</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">✓</span>
                                            <span>Take notes using the notes panel (Press N)</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">✓</span>
                                            <span>Navigate using arrow keys or spacebar</span>
                                        </li>
                                    </>
                                )}
                            </ul>
                        </div>

                        {/* Right Column - Quick Actions */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => window.print()}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-between"
                                >
                                    <span>Print Content</span>
                                    <span>🖨️</span>
                                </button>

                                <button
                                    onClick={() => {
                                        // Bookmark functionality
                                        alert('Bookmarked!');
                                    }}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-between"
                                >
                                    <span>Bookmark This</span>
                                    <span>🔖</span>
                                </button>

                                <button
                                    onClick={() => {
                                        // Share functionality
                                        navigator.clipboard.writeText(window.location.href);
                                        alert('Link copied to clipboard!');
                                    }}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-between"
                                >
                                    <span>Share Link</span>
                                    <span>🔗</span>
                                </button>

                                <button
                                    onClick={() => router.push('/student/dashboard')}
                                    className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-between"
                                >
                                    <span>Go to Dashboard</span>
                                    <span>🏠</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="bg-white border-t mt-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex justify-between items-center text-sm text-gray-500">
                            <div>
                                <span>© {new Date().getFullYear()} Academic Management System</span>
                                <span className="mx-2">•</span>
                                <span>ICT Learning Platform</span>
                            </div>
                            <div>
                                <span>Need help? </span>
                                <button
                                    onClick={() => alert('Help feature coming soon!')}
                                    className="text-blue-600 hover:underline"
                                >
                                    Contact Support
                                </button>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </ProtectedRoute>
    );
}