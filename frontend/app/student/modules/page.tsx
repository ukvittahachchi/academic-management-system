import { Metadata } from 'next';
import ClientStudentModules from './ClientStudentModules';
import { getModulesServer } from '@/lib/api-server';

export const metadata: Metadata = {
    title: 'My Modules | ICT Academy',
    description: 'Browse your enrolled courses and modules.',
};

export default async function StudentModulesPage() {
    const modules = await getModulesServer();

    return <ClientStudentModules initialModules={modules} />;
}
