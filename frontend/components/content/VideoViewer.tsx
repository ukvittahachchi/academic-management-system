'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;
import { ContentMetadata } from '@/lib/types/content';
import { apiClient } from '@/lib/api-client';

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
        <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden text-white">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center space-x-4">
                    <span className="text-2xl">🎬</span>
                    <div>
                        <h2 className="text-lg font-semibold truncate max-w-md">{content.title}</h2>
                        <div className="text-xs text-gray-400">
                            {duration > 0 ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')} total` : 'Loading duration...'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    {/* Playback Speed */}
                    <select
                        value={playbackRate}
                        onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                        className="bg-gray-700 text-sm rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-blue-500"
                    >
                        <option value="0.5">0.5x</option>
                        <option value="0.75">0.75x</option>
                        <option value="1.0">1.0x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2.0">2.0x</option>
                    </select>

                    {/* Download */}
                    {content.is_downloadable && (
                        <button
                            onClick={handleDownload}
                            className="p-2 bg-gray-700 rounded hover:bg-gray-600 transition"
                            title="Download Video"
                        >
                            📥
                        </button>
                    )}
                </div>
            </div>

            {/* Video Player */}
            <div className="flex-1 relative bg-black flex items-center justify-center">
                {!isReady && !error && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                )}

                {error ? (
                    <div className="text-center p-8">
                        <div className="text-red-500 text-5xl mb-4">⚠️</div>
                        <p className="text-xl font-semibold mb-2">Video Error</p>
                        <p className="text-gray-400 mb-6">{error}</p>
                        {content.is_downloadable && (
                            <button
                                onClick={handleDownload}
                                className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 transition"
                            >
                                Download to Watch Offline
                            </button>
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
                        />
                    </div>
                )}
            </div>

            {/* Footer / Stats */}
            <div className="bg-gray-800 p-3 text-xs text-gray-400 flex justify-between items-center border-t border-gray-700">
                <div>
                    Time spent watching: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
                </div>
                <div>
                    Video Player v1.0
                </div>
            </div>
        </div>
    );
}