import React from 'react';
import { checkAuthServer } from '@/lib/api-server';
import { redirect } from 'next/navigation';
import ClientStudentLayout from './ClientStudentLayout';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
    // Server-side auth check
    const auth = await checkAuthServer();

    if (!auth.isAuthenticated) {
        redirect('/login?returnUrl=/student');
    }

    // Role check
    if (auth.user?.role !== 'student') {
        if (auth.user?.role === 'teacher') redirect('/teacher');
        if (auth.user?.role === 'admin') redirect('/admin');
    }

    return (
        <ClientStudentLayout>
            {children}
        </ClientStudentLayout>
    );
}
