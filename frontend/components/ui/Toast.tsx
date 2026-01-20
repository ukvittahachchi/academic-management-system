'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        // Wait for exit animation to finish before calling onClose
        setTimeout(onClose, 300);
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <XCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />
    };

    const bgColors = {
        success: 'bg-white border-l-4 border-green-500',
        error: 'bg-white border-l-4 border-red-500',
        info: 'bg-white border-l-4 border-blue-500'
    };

    return (
        <div
            className={`
        ${bgColors[type]}
        flex items-center gap-3 px-4 py-3 rounded shadow-lg min-w-[300px] max-w-md
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
            role="alert"
        >
            <div className="flex-shrink-0">
                {icons[type]}
            </div>
            <div className="flex-1 text-sm font-medium text-gray-800">
                {message}
            </div>
            <button
                onClick={handleClose}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
