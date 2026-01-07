'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;
import { ContentMetadata } from '@/lib/types/content';
import { apiClient } from '@/lib/api-client';
import StudentButton from '@/components/ui/StudentButton';

interface VideoViewerProps {
    content: ContentMetadata;
    onTimeUpdate?: (timeSpent: number) => void;
    onComplete?: () => void;
}

export default function VideoViewer({ content, onTimeUpdate, onComplete }: VideoViewerProps) {
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isReady, setIsReady] = useState<boolean>(false);
    const [volume, setVolume] = useState<number>(0.8);
    const [playbackRate, setPlaybackRate] = useState<number>(1.0);
    const [timeSpent, setTimeSpent] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    const playerRef = useRef<any>(null);
    const timerRef = useRef<any>(null);

    // Track real time spent watching
    useEffect(() => {
        if (isPlaying) {
            timerRef.current = setInterval(() => {
                setTimeSpent(prev => {
                    const newTime = prev + 1;
                    onTimeUpdate?.(newTime);
                    return newTime;
                });
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isPlaying, onTimeUpdate]);

    const handleReady = () => {
        setIsReady(true);
    };

    const handleError = (error: any) => {
        console.error('Video player error:', error);
        setError('Failed to load video. Please try again later or download the file.');
        setIsReady(true);
    };

    const handleEnded = () => {
        setIsPlaying(false);
        onComplete?.();
    };

    const handleDownload = async () => {
        try {
            const data = await apiClient.getDownloadUrl(content.part_id);

            const link = document.createElement('a');
            link.href = data.download_url;
            link.download = data.file_name || content.title;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download video');
        }
    };

    const playerConfig: any = {
        file: {
            attributes: {
                controlsList: 'nodownload',
                disablePictureInPicture: false
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-surface-50 rounded-3xl overflow-hidden shadow-soft border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-500 rounded-xl flex items-center justify-center">
                        🎬
                    </div>
                    <div>
                        <h2 className="text-lg font-bold truncate max-w-md text-gray-800">{content.title}</h2>
                        <div className="text-xs font-bold text-gray-400">
                            {duration > 0 ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')} total` : 'Loading...'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Playback Speed */}
                    <div className="relative group">
                        <select
                            value={playbackRate}
                            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                            className="bg-gray-50 font-bold text-gray-600 text-sm rounded-xl px-3 py-2 border-none focus:ring-2 focus:ring-brand-500 cursor-pointer hover:bg-gray-100 transition-all appearance-none pr-8"
                        >
                            <option value="0.5">0.5x</option>
                            <option value="0.75">0.75x</option>
                            <option value="1.0">1.0x (Normal)</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2.0">2.0x</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            ▼
                        </div>
                    </div>

                    {/* Download */}
                    {content.is_downloadable && (
                        <StudentButton
                            onClick={handleDownload}
                            variant="accent"
                            size="sm"
                        >
                            📥 Download
                        </StudentButton>
                    )}
                </div>
            </div>

            {/* Video Player Container */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                {!isReady && !error && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50 backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-brand-500"></div>
                    </div>
                )}

                {error ? (
                    <div className="text-center p-8 text-white">
                        <div className="text-red-500 text-6xl mb-4">⚠️</div>
                        <p className="text-2xl font-bold mb-2">Video Error</p>
                        <p className="text-gray-400 mb-6">{error}</p>
                        {content.is_downloadable && (
                            <StudentButton
                                onClick={handleDownload}
                                variant="primary"
                            >
                                Download to Watch Offline
                            </StudentButton>
                        )}
                    </div>
                ) : (
                    <div className="w-full h-full">
                        <ReactPlayer
                            ref={playerRef}
                            url={content.content_url}
                            width="100%"
                            height="100%"
                            controls={true}
                            playing={isPlaying}
                            volume={volume}
                            playbackRate={playbackRate}
                            onReady={handleReady}
                            onStart={() => setIsPlaying(true)}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={handleEnded}
                            onError={handleError}
                            onDuration={setDuration}
                            progressInterval={1000}
                            config={playerConfig}
                            style={{ backgroundColor: 'black' }}
                        />
                    </div>
                )}
            </div>

            {/* Footer / Stats */}
            <div className="bg-white p-3 text-xs font-bold text-gray-400 flex justify-between items-center border-t border-gray-100">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Time watched: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
                </div>
            </div>
        </div>
    );
}