import { Metadata } from 'next';
import ClientAssignments from './ClientAssignments';

export const metadata: Metadata = {
    title: 'My Assignments | ICT Academy',
    description: 'View and complete your class assignments and quizzes.',
};

export default function AssignmentsPage() {
    return <ClientAssignments />;
}
