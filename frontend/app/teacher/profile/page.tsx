import { Metadata } from 'next';
import ClientTeacherProfile from './ClientTeacherProfile';

export const metadata: Metadata = {
    title: 'My Profile | ICT Academy',
    description: 'Manage your teacher account and settings.',
};

export default function ProfilePage() {
    return <ClientTeacherProfile />;
}
