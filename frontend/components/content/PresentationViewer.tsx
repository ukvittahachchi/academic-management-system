'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ContentMetadata } from '@/lib/types/content';
import dynamic from 'next/dynamic';

const PDFWrapper = dynamic(() => import('./PDFWrapper'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-blue-600"></div></div>
});

// Move worker configuration to useEffect to prevent SSR/Import issues
// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

interface PresentationViewerProps {
    content: ContentMetadata;
    onTimeUpdate?: (timeSpent: number) => void;
    onComplete?: () => void;
}

export default function PresentationViewer({ content, onTimeUpdate, onComplete }: PresentationViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [notes, setNotes] = useState<string>('');
    const [showNotes, setShowNotes] = useState<boolean>(false);
    const [timeSpent, setTimeSpent] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);



    // Track time spent and init worker
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setTimeSpent(prev => {
                const newTime = prev + 1;
                onTimeUpdate?.(newTime);
                return newTime;
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [onTimeUpdate]);

    // Handle fullscreen
    const toggleFullscreen = () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().then(() => {
                setIsFullscreen(true);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false);
            });
        }
    };

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowRight':
                case ' ':
                    e.preventDefault();
                    handleNext();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    handlePrevious();
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'n':
                case 'N':
                    e.preventDefault();
                    setShowNotes(prev => !prev);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setIsLoading(false);
    };

    const onDocumentLoadError = (error: Error) => {
        setError(`Failed to load presentation: ${error.message}`);
        setIsLoading(false);
    };

    const handlePrevious = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    const handleNext = () => {
        setCurrentPage(prev => {
            const next = Math.min(prev + 1, numPages);
            if (next === numPages) {
                // Last page reached, mark as complete
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
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download presentation');
        }
    };

    const handleMarkComplete = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        onComplete?.();
    };

    return (
        <div
            ref={containerRef}
            className={`flex flex-col h-full bg-gray-900 text-white rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-800">
                <div className="flex items-center space-x-4">
                    <h2 className="text-lg font-semibold truncate max-w-md">{content.title}</h2>
                    <span className="text-sm text-gray-400">
                        Slide {currentPage} of {numPages}
                    </span>
                </div>

                <div className="flex items-center space-x-3">
                    {/* Controls */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handlePrevious}
                            disabled={currentPage <= 1}
                            className="p-2 rounded hover:bg-gray-700 disabled:opacity-50"
                            title="Previous Slide (←)"
                        >
                            ←
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={currentPage >= numPages}
                            className="p-2 rounded hover:bg-gray-700 disabled:opacity-50"
                            title="Next Slide (→ or Space)"
                        >
                            →
                        </button>
                    </div>

                    {/* Zoom */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setScale(prev => Math.max(prev - 0.1, 0.5))}
                            className="p-2 rounded hover:bg-gray-700"
                            title="Zoom Out"
                        >
                            -
                        </button>
                        <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
                        <button
                            onClick={() => setScale(prev => Math.min(prev + 0.1, 2.0))}
                            className="p-2 rounded hover:bg-gray-700"
                            title="Zoom In"
                        >
                            +
                        </button>
                    </div>

                    {/* Additional Controls */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setShowNotes(prev => !prev)}
                            className={`p-2 rounded hover:bg-gray-700 ${showNotes ? 'bg-blue-600' : ''
                                }`}
                            title="Toggle Notes (N)"
                        >
                            📝
                        </button>

                        <button
                            onClick={toggleFullscreen}
                            className="p-2 rounded hover:bg-gray-700"
                            title="Toggle Fullscreen (F)"
                        >
                            {isFullscreen ? '📱' : '🖥️'}
                        </button>

                        {content.is_downloadable && (
                            <button
                                onClick={handleDownload}
                                className="p-2 rounded hover:bg-gray-700"
                                title="Download"
                            >
                                📥
                            </button>
                        )}

                        <button
                            onClick={handleMarkComplete}
                            className="px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-sm"
                        >
                            Complete
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Slides */}
                <div className={`flex-1 flex items-center justify-center p-8 ${showNotes ? 'w-3/4' : 'w-full'}`}>
                    {isLoading && (
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    )}

                    {error && (
                        <div className="text-center">
                            <p className="text-red-400 mb-4">{error}</p>
                            <p className="text-gray-400">Supported formats: PDF</p>
                        </div>
                    )}

                    {!error && (
                        <>
                            {(content.content_type === 'application/pdf' || content.content_url?.toLowerCase()?.endsWith('.pdf')) ? (
                                <div className="max-w-4xl w-full">
                                    <div className="max-w-4xl w-full">
                                        <PDFWrapper
                                            file={content.content_url}
                                            onLoadSuccess={onDocumentLoadSuccess}
                                            onLoadError={onDocumentLoadError}
                                            pageNumber={currentPage}
                                            scale={scale}
                                            className="shadow-2xl"
                                            pageClassName="shadow-2xl"
                                            loading={
                                                <div className="flex items-center justify-center h-64">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-blue-600"></div>
                                                </div>
                                            }
                                        />
                                    </div>
                                </div>
                            ) : (content.content_type === 'application/vnd.ms-powerpoint' ||
                                content.content_type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                                content.content_url?.toLowerCase()?.endsWith('.ppt') ||
                                content.content_url?.toLowerCase()?.endsWith('.pptx')) ? (
                                <div className="w-full h-full flex flex-col items-center">
                                    {/* Localhost Warning */}
                                    {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                                        <div className="bg-yellow-900/50 border border-yellow-600 text-yellow-200 px-4 py-2 rounded-lg mb-4 text-sm max-w-2xl flex items-center justify-between">
                                            <span>
                                                ⚠️ <strong>Development Note:</strong> The standard Office Viewer requires a public URL. This preview may not load on localhost unless you are using a tunnel (e.g., ngrok).
                                            </span>
                                        </div>
                                    )}

                                    <div className="w-full h-full bg-white rounded-lg shadow-lg overflow-hidden relative">
                                        {/* Loading Fallback */}
                                        {isLoading && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                            </div>
                                        )}

                                        <iframe
                                            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(content.content_url || '')}`}
                                            width="100%"
                                            height="100%"
                                            frameBorder="0"
                                            onLoad={() => {
                                                setIsLoading(false);
                                                setNumPages(1); // PowerPoint viewer doesn't report pages easily back to us
                                            }}
                                            onError={() => {
                                                console.error("Failed to load iframe");
                                                setIsLoading(false);
                                                setError("Failed to load presentation viewer.");
                                            }}
                                            className="w-full h-full"
                                        />
                                    </div>

                                    <div className="mt-4 flex space-x-4">
                                        <button
                                            onClick={handleDownload}
                                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center space-x-2"
                                        >
                                            <span>📥</span>
                                            <span>Download File</span>
                                        </button>
                                        <a
                                            href={content.content_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm flex items-center space-x-2"
                                        >
                                            <span>↗️</span>
                                            <span>Open Direct Link</span>
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center bg-gray-800 p-8 rounded-lg max-w-md">
                                    <div className="text-6xl mb-4">📊</div>
                                    <h3 className="text-xl font-semibold mb-2">Presentation Preview Not Available</h3>
                                    <p className="text-gray-400 mb-6">
                                        This file format ({content.file_name?.split('.').pop()?.toUpperCase() || 'PPT'}) cannot be previewed directly in the browser.
                                    </p>
                                    <button
                                        onClick={handleDownload}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium flex items-center justify-center space-x-2 mx-auto transition-colors"
                                    >
                                        <span>📥</span>
                                        <span>Download Presentation</span>
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Notes Panel */}
                {showNotes && (
                    <div className="w-1/4 border-l border-gray-700 bg-gray-800 p-4 overflow-auto">
                        <div className="mb-4">
                            <h3 className="font-semibold mb-2 flex items-center justify-between">
                                <span>Slide Notes</span>
                                <button
                                    onClick={() => setNotes('')}
                                    className="text-sm text-gray-400 hover:text-white"
                                >
                                    Clear
                                </button>
                            </h3>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add your notes for this slide here..."
                                className="w-full h-48 bg-gray-900 border border-gray-700 rounded p-3 text-sm focus:outline-none focus:border-blue-500"
                            />
                            <button
                                onClick={() => {
                                    // Save notes logic here
                                    alert('Notes saved!');
                                }}
                                className="mt-2 w-full py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm"
                            >
                                Save Notes
                            </button>
                        </div>

                        {/* Quick Notes */}
                        <div className="mt-6">
                            <h4 className="font-semibold mb-2 text-sm">Quick Notes</h4>
                            <div className="space-y-2">
                                <button
                                    onClick={() => setNotes(prev => prev + '\n• Important point')}
                                    className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm"
                                >
                                    Add important point
                                </button>
                                <button
                                    onClick={() => setNotes(prev => prev + '\n❓ Question to ask')}
                                    className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm"
                                >
                                    Add question
                                </button>
                                <button
                                    onClick={() => setNotes(prev => prev + '\n📚 Reference material')}
                                    className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm"
                                >
                                    Add reference
                                </button>
                            </div>
                        </div>

                        {/* Slide Navigation */}
                        <div className="mt-6">
                            <h4 className="font-semibold mb-2 text-sm">Slide Navigation</h4>
                            <div className="grid grid-cols-4 gap-2">
                                {Array.from(new Array(Math.min(numPages, 16)), (_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentPage(index + 1)}
                                        className={`aspect-square rounded flex items-center justify-center text-xs ${currentPage === index + 1
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700 hover:bg-gray-600'
                                            }`}
                                    >
                                        {index + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-800 border-t border-gray-700">
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center space-x-4">
                        <span className="text-gray-400">
                            Time spent: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
                        </span>
                        <span className="text-gray-400">
                            Press <kbd className="px-2 py-1 bg-gray-700 rounded">F</kbd> for fullscreen
                        </span>
                        <span className="text-gray-400">
                            Press <kbd className="px-2 py-1 bg-gray-700 rounded">N</kbd> for notes
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-gray-400">
                            Progress: {Math.round((currentPage / numPages) * 100)}%
                        </span>
                        <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 transition-all"
                                style={{ width: `${(currentPage / numPages) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}