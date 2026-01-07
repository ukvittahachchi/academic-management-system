import { Metadata } from 'next';
import ClientStudentModules from './ClientStudentModules';

export const metadata: Metadata = {
    title: 'My Modules | ICT Academy',
    description: 'Browse your enrolled courses and modules.',
};

export default function StudentModulesPage() {
    return <ClientStudentModules />;
}
