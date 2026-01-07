import { Metadata } from 'next';
import ClientLearnContent from './ClientLearnContent';

export const metadata: Metadata = {
    title: 'Learning Session | ICT Academy',
    description: 'Interactive learning content viewer.',
};

export default function LearnContentPage() {
    return <ClientLearnContent />;
}
