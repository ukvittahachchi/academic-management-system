import { Metadata } from 'next';
import ClientDownloads from './ClientDownloads';

export const metadata: Metadata = {
    title: 'My Downloads | ICT Academy',
    description: 'Access your downloadable learning materials.',
};

export default function DownloadsPage() {
    return <ClientDownloads />;
}
