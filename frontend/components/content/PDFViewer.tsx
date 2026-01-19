'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ContentMetadata } from '@/lib/types/content';
import dynamic from 'next/dynamic';
import StudentButton from '@/components/ui/StudentButton';
import { getFullFileUrl } from '@/lib/utils';

const PDFWrapper = dynamic(() => import('./PDFWrapper'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div></div>
});

interface PDFViewerProps {
    content: ContentMetadata;
    onTimeUpdate?: (timeSpent: number) => void;
    onComplete?: () => void;
}

export default function PDFViewer({ content, onTimeUpdate, onComplete }: PDFViewerProps) {
    console.log('PDFViewer rendered. Content:', content);
    console.log('PDFViewer: Content URL:', content.content_url);
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.2);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    if (!content.content_url) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-surface-50 rounded-3xl p-8 border-2 border-dashed border-gray-200">
                <div className="text-gray-300 text-6xl mb-4">📄</div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">No PDF Content</h3>
                <p className="text-gray-500 text-center max-w-md">
                    There is no PDF file associated with this lesson.
                </p>
            </div>
        );
    }

    // Track time spent - Batch updates to every 30 seconds
    useEffect(() => {
        const UPDATE_INTERVAL = 30; // seconds
        let accumulatedTime = 0;

        timerRef.current = setInterval(() => {
            accumulatedTime += 1;

            // Only report to parent (and thus server) every UPDATE_INTERVAL seconds
            if (accumulatedTime >= UPDATE_INTERVAL) {
                if (onTimeUpdate) {
                    onTimeUpdate(accumulatedTime);
                    accumulatedTime = 0; // Reset after sending
                }
            }
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        console.log('PDFViewer: Document load success', numPages);
        setNumPages(numPages);
        setIsLoading(false);
    };

    const onDocumentLoadError = (err: Error) => {
        console.error('PDFViewer: Document load error', err);
        setError(`Failed to load PDF: ${err.message}`);
        setIsLoading(false);
    };

    const handlePrevious = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    const handleNext = () => {
        setCurrentPage(prev => {
            const next = Math.min(prev + 1, numPages);
            if (next === numPages) {
                onComplete?.();
            }
            return next;
        });
    };

    const handleDownload = async () => {
        try {
            const response = await fetch(`/api/content/${content.part_id}/download-url`);
            const data = await response.json();

            const link = document.createElement('a');
            link.href = data.data.download_url;
            link.download = content.file_name || content.title;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Download failed:', err);
            alert('Failed to download PDF');
        }
    };

    return (
        <div className="flex flex-col h-full bg-surface-50 rounded-3xl overflow-hidden shadow-soft border border-gray-100">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-white border-b border-gray-100 z-10 gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto overflow-hidden">
                    <div className="w-10 h-10 bg-red-100 text-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        📄
                    </div>
                    <div>
                        <h2 className="text-lg font-bold truncate text-gray-800">
                            {content.title}
                        </h2>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Page {currentPage} of {numPages}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-end">
                    <div className="flex bg-gray-50 rounded-xl p-1 gap-1">
                        <button
                            onClick={handlePrevious}
                            disabled={currentPage <= 1}
                            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all font-bold text-gray-600"
                        >
                            ←
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={currentPage >= numPages}
                            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all font-bold text-gray-600"
                        >
                            →
                        </button>
                    </div>

                    <div className="flex bg-gray-50 rounded-xl p-1 gap-1 hidden sm:flex">
                        <button
                            onClick={() => setScale(prev => Math.max(prev - 0.2, 0.5))}
                            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-gray-600 font-bold"
                        >
                            -
                        </button>
                        <span className="flex items-center justify-center px-2 text-sm font-bold text-gray-500 w-14">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={() => setScale(prev => Math.min(prev + 0.2, 2.5))}
                            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-gray-600 font-bold"
                        >
                            +
                        </button>
                    </div>

                    {content.is_downloadable && (
                        <StudentButton
                            onClick={handleDownload}
                            variant="accent"
                            size="sm"
                            className="ml-2"
                        >
                            📥 Download
                        </StudentButton>
                    )}
                </div>
            </div>

            {/* Document Container */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto bg-gray-100/50 flex justify-center p-4 md:p-8"
            >
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-brand-500"></div>
                        <p className="font-medium text-gray-400">Loading your lesson...</p>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center h-full text-red-500 bg-red-50 rounded-2xl p-8">
                        <div className="text-4xl mb-2">⚠️</div>
                        <p className="text-lg font-bold mb-1">Error Loading PDF</p>
                        <p className="text-sm opacity-80">{error}</p>
                    </div>
                )}

                <div className={`transition-all duration-500 ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                    <div className="shadow-soft rounded-xl overflow-hidden">
                        <PDFWrapper
                            file={getFullFileUrl(content.content_url)}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            pageNumber={currentPage}
                            scale={scale}
                            className="flex flex-col gap-4"
                            pageClassName="bg-white"
                            loading={null}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}