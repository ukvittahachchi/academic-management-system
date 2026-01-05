'use client';

import React from 'react';
import { ContentMetadata } from '@/lib/types/content';

interface AssignmentViewerProps {
    content: ContentMetadata;
    onTimeUpdate?: (timeSpent: number) => void;
    onComplete?: () => void;
}

export default function AssignmentViewer({ content }: AssignmentViewerProps) {
    return (
        <div className="flex items-center justify-center h-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8">
            <div className="text-center">
                <span className="text-4xl mb-4 block">📝</span>
                <h3 className="text-lg font-medium text-gray-900">Assignment: {content.title}</h3>
                <p className="text-gray-500 mt-2">
                    Please download the assignment instructions to proceed.
                </p>
            </div>
        </div>
    );
}
