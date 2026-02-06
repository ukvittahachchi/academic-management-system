import { Metadata } from 'next';
import ClientProfile from './ClientProfile';
import { getStudentDashboardServer } from '@/lib/api-server';

export const metadata: Metadata = {
    title: 'My Profile | ICT Academy',
    description: 'Manage your account and view your learning statistics.',
};

export default async function ProfilePage() {
    const dashboardData = await getStudentDashboardServer();
    const stats = dashboardData?.overview || null;

    return <ClientProfile initialStats={stats} />;
}
