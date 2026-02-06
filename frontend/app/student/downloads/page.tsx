import { Metadata } from 'next';
import ClientDownloads from './ClientDownloads';
import { getDownloadableContentServer } from '@/lib/api-server';

export const metadata: Metadata = {
    title: 'My Downloads | ICT Academy',
    description: 'Access your downloadable learning materials.',
};

export default async function DownloadsPage() {
    const downloads = await getDownloadableContentServer();

    return <ClientDownloads initialDownloads={downloads} />;
}
