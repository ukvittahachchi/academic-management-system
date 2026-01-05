import { pdfjs } from 'react-pdf';

export const setupPdfWorker = () => {
    if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
        try {
            // Fallback to specific version if pdfjs.version is unavailable for some reason
            const version = pdfjs.version || '4.4.168';
            pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
            console.log(`PDF Worker initialized with version: ${version}`);
        } catch (error) {
            console.error('Failed to initialize PDF worker:', error);
        }
    }
};
