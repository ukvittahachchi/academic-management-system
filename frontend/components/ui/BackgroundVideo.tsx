'use client';

import { useState, useEffect, useRef } from 'react';

interface BackgroundVideoProps {
    src: string;
}

export default function BackgroundVideo({ src }: BackgroundVideoProps) {
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // Check if video is already ready (for cached cases)
        if (videoRef.current && videoRef.current.readyState >= 3) {
            setIsVideoLoaded(true);
        }
    }, []);

    const handleCanPlay = () => {
        setIsVideoLoaded(true);
    };

    return (
        <>
            {/* Placeholder with a gradient to show immediately */}
            <div
                className={`fixed top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900 to-black -z-20 transition-opacity duration-1000 ${isVideoLoaded ? 'opacity-0' : 'opacity-100'
                    }`}
            />

            <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                onCanPlay={handleCanPlay}
                className={`fixed top-0 left-0 w-full h-full object-cover -z-20 transition-opacity duration-1000 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
            >
                <source src={src} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
        </>
    );
}
