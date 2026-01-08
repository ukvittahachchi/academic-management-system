import React from 'react';
import { useRouter } from 'next/navigation';
import { TeacherClass } from '@/lib/types/teacher';

interface ClassCardProps {
    classData: {
        assignment_id: number;
        module_name: string;
        class_section: string;
        grade_level: string;
        subject?: string;
        student_count: number;
        [key: string]: any;
    };
    onClick?: () => void;
}

export default function ClassCard({ classData, onClick }: ClassCardProps) {
    const router = useRouter();

    const handleViewClass = () => {
        if (onClick) {
            onClick();
        } else {
            router.push(`/teacher/classes/${classData.assignment_id}`);
        }
    };

    const getSubjectColor = (subject?: string) => {
        if (!subject) return 'bg-gray-100 text-gray-800';
        const colors: Record<string, string> = {
            'ICT': 'bg-blue-100 text-blue-800',
            'Computer Science': 'bg-purple-100 text-purple-800',
            'Programming': 'bg-green-100 text-green-800',
            'Mathematics': 'bg-red-100 text-red-800',
            'Science': 'bg-yellow-100 text-yellow-800'
        };
        return colors[subject] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div
            className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
            onClick={handleViewClass}
        >
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSubjectColor(classData.subject)}`}>
                                {classData.subject}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                {classData.grade_level}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{classData.module_name}</h3>
                        <p className="text-gray-600 text-sm mt-1">Section: {classData.class_section}</p>
                    </div>
                    <div className="text-3xl">👨‍🏫</div>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Students</span>
                        <span className="font-semibold">{classData.student_count} students</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Subject</span>
                        <span className="font-medium">{classData.subject}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Grade Level</span>
                        <span className="font-medium">{classData.grade_level}</span>
                    </div>
                </div>

                <button
                    onClick={handleViewClass}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
                >
                    View Class Details
                </button>
            </div>
        </div>
    );
}