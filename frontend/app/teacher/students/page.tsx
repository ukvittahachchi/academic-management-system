import { Metadata } from 'next';
import ClientStudentsPage from './ClientStudentsPage';

export const metadata: Metadata = {
    title: 'Students Directory | ICT Academy',
    description: 'View and manage all your students.',
};

export default function StudentsPage() {
    return <ClientStudentsPage />;
}
