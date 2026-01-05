'use client';

import React, { useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { setupPdfWorker } from '@/lib/pdf-setup';

interface PDFWrapperProps {
    file: string;
    pageNumber?: number;
    scale: number;
    onLoadSuccess: (data: { numPages: number }) => void;
    onLoadError: (error: Error) => void;
    loading?: React.ReactNode;
    className?: string; // For Document
    pageClassName?: string; // For Page
}

export default function PDFWrapper({
    file,
    pageNumber,
    scale,
    onLoadSuccess,
    onLoadError,
    loading,
    className,
    pageClassName
}: PDFWrapperProps) {
    console.log('PDFWrapper rendered for file:', file);

    useEffect(() => {
        console.log('PDFWrapper mounting, setting up worker');
        setupPdfWorker();
    }, []);

    return (
        <Document
            file={file}
            onLoadSuccess={onLoadSuccess}
            onLoadError={onLoadError}
            loading={loading}
            className={className}
        >
            {pageNumber && (
                <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className={pageClassName}
                />
            )}
        </Document>
    );
}
