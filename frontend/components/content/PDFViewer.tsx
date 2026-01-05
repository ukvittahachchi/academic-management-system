'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ContentMetadata } from '@/lib/types/content';
import dynamic from 'next/dynamic';

const PDFWrapper = dynamic(() => import('./PDFWrapper'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
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
            <div className="flex flex-col items-center justify-center h-full bg-gray-100 rounded-lg p-8">
                <div className="text-gray-400 text-6xl mb-4">📄</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No PDF Content</h3>
                <p className="text-gray-500 text-center max-w-md">
                    There is no PDF file associated with this learning material yet.
                    Please contact your instructor if you believe this is an error.
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
            // Optional: send remaining time on unmount? 
            // Often tricky with async unmounts/closures, sticking to interval for now.
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
        <div className="flex flex-col h-full bg-gray-100 rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm z-10">
                <div className="flex items-center space-x-4">
                    <h2 className="text-lg font-semibold truncate max-w-xs md:max-w-md text-gray-800">
                        {content.title}
                    </h2>
                    <span className="text-sm text-gray-500 hidden sm:inline-block">
                        Page {currentPage} of {numPages}
                    </span>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={handlePrevious}
                        disabled={currentPage <= 1}
                        className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 text-gray-700"
                        title="Previous Page"
                    >
                        ←
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={currentPage >= numPages}
                        className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 text-gray-700"
                        title="Next Page"
                    >
                        →
                    </button>

                    <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>

                    <button
                        onClick={() => setScale(prev => Math.max(prev - 0.2, 0.5))}
                        className="p-2 rounded hover:bg-gray-100 text-gray-700 hidden sm:block"
                        title="Zoom Out"
                    >
                        -
                    </button>
                    <span className="text-sm w-12 text-center text-gray-600 hidden sm:block">
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        onClick={() => setScale(prev => Math.min(prev + 0.2, 2.5))}
                        className="p-2 rounded hover:bg-gray-100 text-gray-700 hidden sm:block"
                        title="Zoom In"
                    >
                        +
                    </button>

                    {content.is_downloadable && (
                        <button
                            onClick={handleDownload}
                            className="ml-2 p-2 rounded hover:bg-gray-100 text-gray-700"
                            title="Download"
                        >
                            📥
                        </button>
                    )}
                </div>
            </div>

            {/* Document Container */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto bg-gray-200 flex justify-center p-4"
            >
                {isLoading && (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center h-full text-red-600">
                        <p className="text-lg font-semibold mb-2">Error Loading PDF</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                <div className={`shadow-lg transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                    <PDFWrapper
                        file={content.content_url}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        pageNumber={currentPage}
                        scale={scale}
                        className="flex flex-col gap-4"
                        pageClassName="bg-white"
                        loading={
                            <div className="h-[800px] w-[600px] bg-white animate-pulse flex items-center justify-center text-gray-400">
                                Loading Page...
                            </div>
                        }
                    />
                </div>
            </div>
        </div>
    );
}