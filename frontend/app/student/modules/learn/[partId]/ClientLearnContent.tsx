'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { LuArrowLeft, LuCheck, LuPrinter, LuLink, LuPen, LuFileText, LuVideo, LuPlay, LuInfo, LuBookOpen } from "react-icons/lu";

const PDFViewer = dynamic(() => import('@/components/content/PDFViewer'), { ssr: false });
import VideoViewer from '@/components/content/VideoViewer';
const PresentationViewer = dynamic(() => import('@/components/content/PresentationViewer'), { ssr: false });
import AssignmentViewer from '@/components/content/AssignmentViewer';
import { apiClient } from '@/lib/api-client';
import { ContentResponse } from '@/lib/types/content';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import StudentButton from '@/components/ui/StudentButton';

export default function ClientLearnContent() {
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
            const data = await apiClient.getContentDetails(partId);
            setContentData(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load content');
        } finally {
            setLoading(false);
        }
    };

    const handleTimeUpdate = async (timeSpent: number) => {
        try { await apiClient.updateAccessTime(partId, timeSpent); } catch (err) { console.error(err); }
    };

    const handleMarkComplete = async () => {
        try {
            setIsCompleting(true);
            await apiClient.markAsCompleted(partId);
            if (contentData) {
                setContentData({ ...contentData, progress: { ...contentData.progress!, status: 'completed' } });
            }
        } catch (err: any) {
            alert(`Failed: ${err.message}`);
        } finally {
            setIsCompleting(false);
        }
    };

    const renderViewer = () => {
        if (!contentData) return null;
        const { content } = contentData;
        const props = { content, onTimeUpdate: handleTimeUpdate, onComplete: handleMarkComplete };

        switch (content.part_type) {
            case 'reading': return <PDFViewer {...props} />;
            case 'video': return <VideoViewer {...props} />;
            case 'presentation': return <PresentationViewer {...props} />;
            case 'assignment': return <AssignmentViewer {...props} />;
            default: return <div>Unsupported content</div>;
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>;
    if (error) return <div className="p-8"><ErrorMessage error={error} onRetry={loadContent} /></div>;

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50/50 pb-24">
                <header className="bg-gradient-to-br from-indigo-600 via-purple-600 to-brand-500 pb-32 relative text-white">
                    <div className="max-w-7xl mx-auto px-6 pt-8 pb-12 relative z-10">
                        <StudentButton onClick={() => router.back()} variant="ghost" className="text-white hover:bg-white/10 mb-6"><LuArrowLeft className="mr-2" /> Back</StudentButton>
                        <h1 className="text-3xl font-black">{contentData?.content.title}</h1>
                        <div className="flex gap-4 mt-4">
                            {contentData?.progress?.status !== 'completed' && (
                                <StudentButton onClick={handleMarkComplete} disabled={isCompleting} className="bg-white text-indigo-600 font-bold">
                                    {isCompleting ? 'Saving...' : 'Mark as Done'}
                                </StudentButton>
                            )}
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-6 -mt-20 relative z-20 space-y-8 animate-[fade-in_0.5s_ease-out]">
                    <div className="rounded-[2.5rem] overflow-hidden shadow-2xl bg-white min-h-[600px]">
                        {renderViewer()}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
