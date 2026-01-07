import { Metadata } from 'next';
import ClientModuleNavigation from './ClientModuleNavigation';

export const metadata: Metadata = {
    title: 'Module Content | ICT Academy',
    description: 'View lessons, units, and track your progress.',
};

export default function ModuleNavigationPage() {
    return <ClientModuleNavigation />;
}
