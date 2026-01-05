import { pdfjs } from 'react-pdf';

// Only runs on client
export const setupPdfWorker = () => {
    if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
        const version = '4.4.168';
        console.log('PDF Worker Version:', version);
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
    }
};
