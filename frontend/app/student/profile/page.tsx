import { Metadata } from 'next';
import ClientProfile from './ClientProfile';

export const metadata: Metadata = {
    title: 'My Profile | ICT Academy',
    description: 'Manage your account and view your learning statistics.',
};

export default function ProfilePage() {
    return <ClientProfile />;
}
