import { Metadata } from 'next';
import ClientStudentDashboard from './ClientStudentDashboard';
import { getStudentDashboardServer } from '@/lib/api-server';

export const metadata: Metadata = {
    title: 'Student Dashboard | ICT Academy',
    description: 'Track your progress, view upcoming assignments, and access your learning modules.',
};

export default async function StudentDashboardPage() {
    const dashboardData = await getStudentDashboardServer();

    return <ClientStudentDashboard initialData={dashboardData} />;
}
