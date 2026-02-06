import { Metadata } from 'next';
import ClientAssignments from './ClientAssignments';
import { getStudentAssignmentsServer } from '@/lib/api-server';

export const metadata: Metadata = {
    title: 'My Assignments | ICT Academy',
    description: 'View and complete your class assignments and quizzes.',
};

export default async function AssignmentsPage() {
    const assignments = await getStudentAssignmentsServer();

    return <ClientAssignments initialAssignments={assignments} />;
}
