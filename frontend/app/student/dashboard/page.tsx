import { Metadata } from 'next';
import ClientStudentDashboard from './ClientStudentDashboard';

export const metadata: Metadata = {
    title: 'Student Dashboard | ICT Academy',
    description: 'Track your progress, view upcoming assignments, and access your learning modules.',
};

export default function StudentDashboardPage() {
    return <ClientStudentDashboard />;
}
